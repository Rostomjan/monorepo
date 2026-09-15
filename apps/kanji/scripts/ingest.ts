#!/usr/bin/env bun
/**
 * Content ingest pipeline: open datasets -> versioned extracts + content files.
 *
 * Sources (all open-licensed; the host allowlist in lib/parse.ts refuses
 * anything else, so proprietary corpora can never enter the pipeline):
 * - KANJIDIC2 (EDRDG, CC BY-SA 4.0): kanji spine
 * - KRADFILE (EDRDG licence): visual decomposition
 * - jmdict-eng-common (EDRDG, CC BY-SA 4.0): common vocab
 * - jmdict-examples-eng (Tanaka/Tatoeba-sourced): filtered example sentences
 * - Kanji alive language-data (CC-BY 4.0): radicals, kanji examples, audio refs
 * - KanjiVG (CC BY-SA 3.0): per-glyph stroke SVGs, fetched on demand + cached
 *
 * Layout: downloads + extracts live under content/.vendor/ (gitignored,
 * reproducible); committed content lives under content/level-N/ + sources.json.
 *
 * Usage: bun scripts/ingest.ts [--refresh]
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { XMLParser } from "fast-xml-parser";
import {
  assertAllowedUrl,
  extractCommonVocab,
  extractExamples,
  parseCsv,
  parseKanjiAliveRadicals,
  parseKradfile,
} from "./lib/parse";

const ROOT = join(import.meta.dir, "..");
const VENDOR = join(ROOT, "content", ".vendor");
const UPSTREAM = join(ROOT, "content", "upstream");

const JMDICT_TAG = "3.6.2%2B20260914172325";
const JMDICT_BASE = `https://github.com/scriptin/jmdict-simplified/releases/download/${JMDICT_TAG}`;

const SOURCES = {
  kanjidic2: "http://www.edrdg.org/kanjidic/kanjidic2.xml.gz",
  kradfile: "http://ftp.edrdg.org/pub/Nihongo/kradfile.gz",
  jmdictCommon: `${JMDICT_BASE}/jmdict-eng-common-3.6.2+20260914172325.json.tgz`,
  jmdictExamples: `${JMDICT_BASE}/jmdict-examples-eng-3.6.2+20260914172325.json.tgz`,
  kanjiAliveRepo: "https://github.com/kanjialive/kanji-data-media",
} as const;

async function download(url: string, dest: string, refresh: boolean): Promise<void> {
  assertAllowedUrl(url);
  if (existsSync(dest) && !refresh) {
    console.log(`cached ${dest}`);
    return;
  }
  console.log(`GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function gunzipToJson(src: string): Promise<unknown> {
  const proc = Bun.spawnSync(["tar", "-xzOf", src]);
  if (proc.exitCode !== 0 || proc.stdout.length === 0) {
    throw new Error(`Failed to extract ${src}`);
  }
  return JSON.parse(Buffer.from(proc.stdout).toString("utf8"));
}

interface KanjidicEntry {
  literal: string;
  meanings: string[];
  on: string[];
  kun: string[];
  grade: number | null;
  strokes: number | null;
  freq: number | null;
}

function parseKanjidic2(xml: string): KanjidicEntry[] {
  const parser = new XMLParser({ ignoreAttributes: false, isArray: () => true });
  const doc = parser.parse(xml) as {
    kanjidic2?: Array<{ character?: Array<Record<string, unknown[]>> }>;
  };
  // isArray forces every tag (including the root) into arrays.
  const root = Array.isArray(doc.kanjidic2) ? doc.kanjidic2[0] : doc.kanjidic2;
  const chars = root?.character ?? [];
  const text = (v: unknown): string => String((v as { "#text"?: string })["#text"] ?? v);
  return chars.map((ch) => {
    const rmgroup = (ch.reading_meaning?.[0] as Record<string, unknown[]>)?.rmgroup?.[0] as
      | Record<string, unknown[]>
      | undefined;
    const readings = (rmgroup?.reading ?? []) as Array<Record<string, unknown>>;
    const meanings = (rmgroup?.meaning ?? []) as Array<Record<string, unknown>>;
    const misc = ch.misc?.[0] as Record<string, unknown[]> | undefined;
    const num = (key: string): number | null => {
      const v = misc?.[key]?.[0];
      if (v === undefined) return null;
      const n = Number(text(v));
      return Number.isFinite(n) ? n : null;
    };
    return {
      literal: text(ch.literal?.[0]),
      meanings: meanings
        .filter((m) => (m as { "@_m_lang"?: string })["@_m_lang"] === undefined)
        .map(text),
      on: readings
        .filter((r) => r["@_r_type"] === "ja_on")
        .map(text),
      kun: readings
        .filter((r) => r["@_r_type"] === "ja_kun")
        .map(text),
      grade: num("grade"),
      strokes: num("stroke_count"),
      freq: num("freq"),
    };
  });
}

async function main(): Promise<void> {
  const refresh = process.argv.includes("--refresh");
  mkdirSync(VENDOR, { recursive: true });
  mkdirSync(UPSTREAM, { recursive: true });

  // 1. KANJIDIC2 spine.
  const kanjidicGz = join(VENDOR, "kanjidic2.xml.gz");
  await download(SOURCES.kanjidic2, kanjidicGz, refresh);
  const kanjidicXml = Buffer.from(
    Bun.gunzipSync(new Uint8Array(await Bun.file(kanjidicGz).arrayBuffer())),
  ).toString("utf8");
  const spine = parseKanjidic2(kanjidicXml);
  writeFileSync(join(UPSTREAM, "kanjidic2.json"), JSON.stringify(spine));
  console.log(`kanjidic2: ${spine.length} characters`);

  // 2. KRADFILE decomposition.
  const kradGz = join(VENDOR, "kradfile.gz");
  await download(SOURCES.kradfile, kradGz, refresh);
  const kradBody = Buffer.from(
    Bun.gunzipSync(new Uint8Array(await Bun.file(kradGz).arrayBuffer())),
  ).toString("utf8");
  const krad = parseKradfile(kradBody);
  const decomposition: Record<string, string[]> = {};
  for (const e of krad) decomposition[e.kanji] = e.components;
  writeFileSync(join(UPSTREAM, "kradfile.json"), JSON.stringify(decomposition));
  console.log(`kradfile: ${krad.length} entries`);

  // 3. Common vocab.
  const vocabTgz = join(VENDOR, "jmdict-eng-common.tgz");
  await download(SOURCES.jmdictCommon, vocabTgz, refresh);
  const vocabDoc = (await gunzipToJson(vocabTgz)) as Parameters<
    typeof extractCommonVocab
  >[0];
  const vocab = extractCommonVocab(vocabDoc);
  writeFileSync(join(UPSTREAM, "jmdict-common.json"), JSON.stringify(vocab));
  console.log(`jmdict-eng-common: ${vocab.length} common written forms`);

  // 4. Example sentences (flattened Tatoeba-sourced jpn/eng pairs).
  const exTgz = join(VENDOR, "jmdict-examples-eng.tgz");
  await download(SOURCES.jmdictExamples, exTgz, refresh);
  const exDoc = (await gunzipToJson(exTgz)) as Parameters<typeof extractExamples>[0];
  const examples = extractExamples(exDoc);
  writeFileSync(join(UPSTREAM, "jmdict-examples.json"), JSON.stringify(examples));
  console.log(`jmdict-examples-eng: ${examples.length} sentence pairs`);

  // 5. Kanji alive (shallow, blobless, sparse: CSVs only).
  const kaDir = join(VENDOR, "kanji-data-media");
  if (!existsSync(kaDir) || refresh) {
    if (existsSync(kaDir)) rmSync(kaDir, { recursive: true });
    assertAllowedUrl(SOURCES.kanjiAliveRepo);
    await $`git clone --quiet --depth 1 --filter=blob:none --sparse ${SOURCES.kanjiAliveRepo} ${kaDir}`.quiet();
    await $`git -C ${kaDir} sparse-checkout set language-data`.quiet();
  }
  const radicalsCsv = await Bun.file(join(kaDir, "language-data", "japanese-radicals.csv")).text();
  const radicals = parseKanjiAliveRadicals(radicalsCsv);
  writeFileSync(join(UPSTREAM, "kanji-alive-radicals.json"), JSON.stringify(radicals));
  const kaData = parseCsv(
    await Bun.file(join(kaDir, "language-data", "ka_data.csv")).text(),
  );
  console.log(
    `kanji-alive: ${radicals.length} radicals, ka_data ${kaData.length - 1} kanji rows`,
  );

  console.log("ingest complete: extracts under content/upstream/");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
