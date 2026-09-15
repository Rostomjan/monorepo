#!/usr/bin/env bun
/**
 * QA a content level against upstream extracts. Fails loudly on any violation.
 *
 * Encodes the hard-won rules of this pipeline:
 * - readings stored upstream-verbatim (katakana on'yomi, dotted kun), normalized
 *   to hiragana at check time (see src/lib/grading.ts normalizeReading);
 * - components use OUR radical glyphs; content/radical-forms.json bridges to the
 *   JIS forms KRADFILE/KANJIDIC2 use (byte-exact, verified);
 * - KRADFILE quirks: missing/empty entry = single-component primitive;
 *   repeated components listed once (we repeat pedagogically: set-compare);
 *   self-referential entries (品-style) ignored; kradfile writes 老 for the
 *   耂 base, which is our ⽼ radical;
 * - vocab readings verified against the jmdict extract (normalized);
 * - proprietary corpora (RTK, KanjiDamage, Koohii, Kanshudo, WaniKani) refused.
 *
 * Usage: bun scripts/qa-level.ts <level>   (e.g. bun scripts/qa-level.ts 4)
 */
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const read = (p: string) => Bun.file(join(ROOT, p)).json() as Promise<never>;

const norm = (s: string): string =>
  s.replace(/\./g, "").replace(/[ァ-ン]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

async function main(): Promise<void> {
  const level = Number(process.argv[2]);
  if (!Number.isInteger(level)) {
    console.error("Usage: bun scripts/qa-level.ts <level>");
    process.exit(2);
  }
  const errors: string[] = [];
  const forms = ((await read("content/radical-forms.json")) as { forms: Record<string, string> }).forms;
  const toOurs = new Map(Object.entries(forms).map(([o, j]) => [j, o]));
  toOurs.set("老", "⽼");
  const toJis = (g: string): string => forms[g] ?? g;

  const rads = (await read(`content/level-${level}/radicals.json`).catch(() => [])) as Array<{
    glyph: string; level: number; mnemonic: string; sources: string[]; meanings: string[];
  }>;
  const kanji = (await read(`content/level-${level}/kanji.json`)) as Array<{
    glyph: string; level: number; readings: string[]; components: string[];
    mnemonic: string; sources: string[];
  }>;
  const vocab = (await read(`content/level-${level}/vocab.json`)) as Array<{
    glyph: string; level: number; readings: string[]; mnemonic: string; sources: string[];
    examples: Array<{ text: string; gloss: string }>;
  }>;
  const spine = new Map<string, { on: string[]; kun: string[] }>(
    ((await read("content/upstream/kanjidic2.json")) as Array<{
      literal: string; on: string[]; kun: string[];
    }>).map((s) => [s.literal, s]),
  );
  const krad = (await read("content/upstream/kradfile.json")) as Record<string, string[]>;
  const vext = (await read("content/upstream/jmdict-common.json")) as Array<{
    text: string; reading: string;
  }>;

  for (const r of rads) {
    if (!(r.glyph in forms)) errors.push(`radical ${r.glyph} not in radical-forms.json`);
    if (r.level !== level || !r.mnemonic || !r.sources.length || !r.meanings.length) {
      errors.push(`radical ${r.glyph || "?"}: bad fields`);
    }
  }
  for (const k of kanji) {
    if (k.level !== level) errors.push(`${k.glyph}: wrong level`);
    const s = spine.get(k.glyph);
    if (!s) {
      errors.push(`${k.glyph}: not in kanjidic2`);
      continue;
    }
    const up = new Set([...s.on, ...s.kun].map(norm));
    for (const r of k.readings) {
      if (!up.has(norm(r))) errors.push(`${k.glyph}: reading ${r} not upstream`);
    }
    for (const c of k.components) {
      if (!(c in forms) && !spine.has(c)) errors.push(`${k.glyph}: component ${c} unknown`);
    }
    const raw = krad[k.glyph] ?? [];
    if (raw.length === 0) {
      const got = [...k.components].map(toJis);
      if (got.length !== 1 || got[0] !== k.glyph) {
        errors.push(`${k.glyph}: primitive should be single self-component, got [${k.components}]`);
      }
    } else {
      const expSet = new Set(raw.map((c) => toOurs.get(c) ?? c).filter((c) => c !== k.glyph));
      const gotSet = new Set(k.components);
      const missing = [...expSet].filter((c) => !gotSet.has(c));
      const extra = [...gotSet].filter((c) => !expSet.has(c));
      if (missing.length || extra.length) {
        errors.push(`${k.glyph}: components ours=[${[...gotSet]}] kradfile~[${[...expSet]}]`);
      }
    }
    if (!k.mnemonic || !k.sources.length) errors.push(`${k.glyph}: missing mnemonic/sources`);
  }
  for (const v of vocab) {
    if (v.level !== level) errors.push(`vocab ${v.glyph}: wrong level`);
    const hit = vext.find((x) => x.text === v.glyph && norm(x.reading) === norm(v.readings[0]));
    if (!hit) errors.push(`vocab ${v.glyph}: reading mismatch`);
    if (!v.mnemonic || !v.sources.length) errors.push(`vocab ${v.glyph}: missing mnemonic/sources`);
    for (const ex of v.examples) {
      if (!ex.text || !ex.gloss) errors.push(`vocab ${v.glyph}: bad example`);
    }
  }
  const bad = /(wanikani|kanjidamage|koohii|kanshudo)/i;
  for (const f of [...rads, ...kanji, ...vocab]) {
    if (bad.test(JSON.stringify(f))) errors.push(`${(f as { glyph: string }).glyph}: proprietary marker`);
  }

  if (errors.length > 0) {
    console.error(`QA FAIL level ${level}:\n` + errors.join("\n"));
    process.exit(1);
  }
  console.log(
    `QA PASS level ${level}: ${rads.length} radicals + ${kanji.length} kanji + ${vocab.length} vocab`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
