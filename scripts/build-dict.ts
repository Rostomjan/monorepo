// Build-time only: fetch JMDict eng-common and emit compact dict.
// Usage:
//   bun scripts/build-dict.ts                 # eng-common base (~20k words)
//   bun scripts/build-dict.ts --extended      # + JMDict_Extended join (JLPT/freq/pitch, ~170MB download)
//   bun scripts/build-dict.ts --limit 500     # smoke test without overwriting full dict
// Writes apps/kotoba/src/data/dict-compact.json + dict-meta.json
// Zero runtime cost. Requires network only when refreshing the snapshot.

const OUT = new URL("../apps/kotoba/src/data/dict-compact.json", import.meta.url);
const META = new URL("../apps/kotoba/src/data/dict-meta.json", import.meta.url);

const args = new Set(process.argv.slice(2));
const wantExtended = args.has("--extended");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0;

interface Sense {
  gloss?: { text?: string; lang?: string }[];
}
interface KanjiElem {
  text?: string;
  common?: boolean;
  jlptLevel?: number;
  furigana?: { ruby?: string; rt?: string }[];
  pitchAccent?: { hatsuon?: string; accPatts?: string } | null;
  freq?: { value?: number }[];
}
interface KanaElem {
  text?: string;
  common?: boolean;
}
interface JmdictWord {
  id?: string;
  kanji?: KanjiElem[];
  kana?: KanaElem[];
  sense?: Sense[];
}

interface DictRecord {
  k: string;
  r: string;
  g: string[];
  j: string | number;
  f?: number;
  p?: string;
}

async function latestAsset(repo: string, match: (n: string) => boolean): Promise<{ url: string; tag: string; name: string }> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { "User-Agent": "kotoba-build-dict", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`release lookup failed for ${repo}: ${res.status}`);
  const j = (await res.json()) as { tag_name: string; assets: { name: string; browser_download_url: string }[] };
  const hit = j.assets.find((a) => match(a.name));
  if (!hit) throw new Error(`no matching asset in ${repo}@${j.tag_name}`);
  return { url: hit.browser_download_url, tag: j.tag_name, name: hit.name };
}

async function fetchTgzJson(url: string): Promise<{ words: JmdictWord[]; version: string }> {
  console.log(`  GET ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": "kotoba-build-dict" } });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = `${process.env.TMPDIR || "/tmp"}/kotoba-dict-${Date.now()}.tgz`;
  await Bun.write(tmp, buf);
  // tgz contains a single .json file
  const proc = Bun.spawnSync(["tar", "-xOzf", tmp]);
  await Bun.$`rm -f ${tmp}`.quiet().catch(() => {});
  if (proc.exitCode !== 0) throw new Error(`tar extract failed: ${proc.stderr.toString().slice(0, 500)}`);
  const text = proc.stdout.toString();
  // Extended tarball's JSON starts with a BOM; be liberal in what we accept.
  const clean = text.replace(/^\uFEFF/, "").trimStart();
  const start = clean.search(/[{[]/);
  if (start < 0) throw new Error(`no JSON payload in archive (first 120 chars: ${clean.slice(0, 120)})`);
  const parsed = JSON.parse(clean.slice(start));
  const words: JmdictWord[] = parsed.words ?? parsed.dictionary ?? parsed;
  if (!Array.isArray(words)) throw new Error(`unexpected JSON shape (keys: ${Object.keys(parsed).slice(0, 8)})`);
  return { words, version: parsed.version ?? "" };
}

function jlptOf(level: number | undefined): string | number {
  if (!level) return 0;
  // Extended uses jlptLevel 5..1 (5=N5). jmdict-compact uses "N5".. or 0.
  if (level >= 1 && level <= 5) return `N${6 - level}` as const;
  return 0;
}

function toRecords(words: JmdictWord[]): DictRecord[] {
  const out: DictRecord[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    const kana = w.kana?.[0]?.text ?? "";
    if (!kana) continue;
    const glosses: string[] = [];
    for (const s of w.sense ?? []) {
      for (const g of s.gloss ?? []) {
        if ((g.lang ?? "eng") === "eng" && g.text && glosses.length < 3) glosses.push(g.text);
      }
      if (glosses.length >= 3) break;
    }
    if (!glosses.length) continue;
    const kanjis = (w.kanji ?? []).map((k) => k.text).filter(Boolean) as string[];
    const surfaces = kanjis.length ? kanjis.slice(0, 3) : [kana];
    // Extended join data lives on the kanji element; carry it through.
    const kElem = w.kanji?.[0];
    const freq = kElem?.freq?.[0]?.value;
    const pitch = kElem?.pitchAccent?.hatsuon;
    const jlpt = jlptOf(kElem?.jlptLevel);
    for (const surface of surfaces) {
      const key = `${surface}｜${kana}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const rec: DictRecord = { k: surface, r: kana, g: glosses, j: jlpt };
      if (freq) rec.f = freq;
      if (pitch) rec.p = pitch;
      out.push(rec);
      // kana-only alias so ひらがな paste also hits
      const kanaKey = `${kana}｜${kana}`;
      if (!seen.has(kanaKey) && surface !== kana) {
        seen.add(kanaKey);
        const alias: DictRecord = { k: kana, r: kana, g: glosses, j: jlpt };
        if (freq) alias.f = freq;
        out.push(alias);
      }
      if (LIMIT && out.length >= LIMIT) return out;
    }
    if (LIMIT && out.length >= LIMIT) break;
  }
  return out;
}

console.log(`kotoba dict:update`);
const base = await latestAsset("scriptin/jmdict-simplified", (n) => n.startsWith("jmdict-eng-common-") && n.endsWith(".json.tgz"));
console.log(`  base: ${base.name} (${base.tag})`);
let { words } = await fetchTgzJson(base.url);
console.log(`  base words: ${words.length}`);

if (wantExtended) {
  // Extended file is ~170MB JSON — join by id for JLPT/freq/pitch.
  const ext = await latestAsset("Bluskyo/JMDict_Extended", (n) => n.endsWith(".json.tar.gz"));
  console.log(`  extended: ${ext.name} (${ext.tag}) — large download, streaming join…`);
  const { words: ew } = await fetchTgzJson(ext.url);
  console.log(`  extended words: ${ew.length}`);
  const byId = new Map<string, JmdictWord>();
  for (const w of ew) if (w.id) byId.set(w.id, w);
  let joined = 0;
  for (const w of words) {
    if (!w.id) continue;
    const e = byId.get(w.id);
    if (e?.kanji?.[0]) {
      w.kanji = e.kanji as KanjiElem[];
      joined++;
    }
  }
  console.log(`  joined: ${joined}`);
}

const records = toRecords(words);
// Frequency-first sort keeps due-queue + greedySplit relevant for common words.
records.sort((a, b) => (a.f ?? 9999999) - (b.f ?? 9999999));
console.log(`  compact records: ${records.length}`);

if (!LIMIT) {
  await Bun.write(OUT, JSON.stringify(records));
  await Bun.write(
    META,
    JSON.stringify(
      {
        name: "kotoba-dict-compact",
        source: `scriptin/jmdict-simplified ${base.tag} eng-common${wantExtended ? " + Bluskyo/JMDict_Extended join (jlpt/furigana/frequency/pitch)" : ""}`,
        version: "0.2.0",
        date: new Date().toISOString().slice(0, 10),
        license: "EDRDG JMdict (CC-BY-SA); see https://www.edrdg.org/",
        count: records.length,
        update: "bun run dict:update [--extended]",
      },
      null,
      2,
    ),
  );
  console.log(`  wrote ${OUT.pathname} + meta`);
} else {
  console.log(`  --limit=${LIMIT}: dry run, files unchanged. First record: ${JSON.stringify(records[0])}`);
}
