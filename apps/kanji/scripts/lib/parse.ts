/**
 * Pure transforms for the content ingest pipeline.
 * No filesystem, no network — everything here is unit-tested.
 * Upstream formats: KRADFILE (EDRDG, plain text), Kanji alive CSVs (RFC 4180),
 * jmdict-simplified JSON (kanjidic shape TBD by ticket 07; vocab + examples here).
 */

export interface KradEntry {
  kanji: string;
  components: string[];
}

/** Parse KRADFILE body: `KANJI : comp1 comp2 ...`, `#` comments, blank lines. */
export function parseKradfile(body: string): KradEntry[] {
  const entries: KradEntry[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(\S+)\s*:\s*(.*)$/);
    if (!match) throw new Error(`Unparseable KRADFILE line: ${JSON.stringify(line)}`);
    const [, kanji, rest] = match;
    entries.push({ kanji, components: rest.split(/\s+/).filter(Boolean) });
  }
  return entries;
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(body: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // Skip fully-empty trailing rows.
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };
  const text = body.replace(/\r\n/g, "\n");
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
    } else if (c === '"') {
      inQuotes = true;
      i += 1;
    } else if (c === ",") {
      pushField();
      i += 1;
    } else if (c === "\n") {
      pushRow();
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }
  pushRow();
  return rows;
}

export interface KanjiAliveRadical {
  stroke: string;
  glyph: string;
  meaning: string;
  reading: string;
  readingRomaji: string;
}

/** Parse Kanji alive japanese-radicals.csv (header row + data). */
export function parseKanjiAliveRadicals(body: string): KanjiAliveRadical[] {
  const rows = parseCsv(body);
  if (rows.length < 2) throw new Error("Radicals CSV has no data rows");
  const header = rows[0];
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Radicals CSV missing column: ${name}`);
    return i;
  };
  const c = {
    stroke: idx("Stroke#"),
    glyph: idx("Radical"),
    meaning: idx("Meaning"),
    reading: idx("Reading"),
    romaji: idx("Reading-R"),
  };
  return rows.slice(1).map((r) => ({
    stroke: r[c.stroke] ?? "",
    glyph: r[c.glyph] ?? "",
    meaning: r[c.meaning] ?? "",
    reading: r[c.reading] ?? "",
    readingRomaji: r[c.romaji] ?? "",
  }));
}

export interface CommonVocabEntry {
  id: string;
  text: string;
  reading: string;
  glosses: string[];
}

/**
 * Extract common-written vocab from jmdict-simplified eng-common JSON.
 * Shape: { words: [{ id, kanji: [{common, text}], kana: [{common, text,
 *   appliesToKanji}], sense: [{ english_definitions }] }] }.
 * Keeps entries with at least one common kanji form; each written form gets
 * its own entry with the reading resolved via appliesToKanji ("*" or the
 * form itself), falling back to a common kana form, then the first kana form.
 */
export function extractCommonVocab(doc: {
  words?: Array<{
    id?: string;
    kanji?: Array<{ common?: boolean; text?: string }>;
    kana?: Array<{ common?: boolean; text?: string; appliesToKanji?: string[] }>;
    sense?: Array<{ gloss?: Array<{ lang?: string; text?: string }> }>;
  }>;
}): CommonVocabEntry[] {
  const out: CommonVocabEntry[] = [];
  for (const w of doc.words ?? []) {
    const commonKanji = (w.kanji ?? []).filter((k) => k.common && k.text);
    if (commonKanji.length === 0) continue;
    const kana = w.kana ?? [];
    const glosses = [
      ...new Set(
        (w.sense ?? []).flatMap((s) =>
          (s.gloss ?? []).filter((g) => g.lang === "eng" && g.text).map((g) => g.text as string),
        ),
      ),
    ];
    for (const k of commonKanji) {
      const text = k.text as string;
      const reading =
        kana.find(
          (x) => x.text && (x.appliesToKanji?.includes("*") || x.appliesToKanji?.includes(text)),
        )?.text ??
        kana.find((x) => x.common && x.text)?.text ??
        kana.find((x) => x.text)?.text ??
        "";
      out.push({ id: w.id ?? "", text, reading, glosses });
    }
  }
  return out;
}

export interface ExamplePair {
  wordId: string;
  tatoebaId: string;
  jpn: string;
  eng: string;
}

/**
 * Flatten jmdict-simplified examples JSON
 * ({ words: [{ id, sense: [{ examples: [{ source, sentences }] }] }] })
 * into compact Japanese/English pairs (Tatoeba-sourced only).
 */
export function extractExamples(doc: {
  words?: Array<{
    id?: string;
    sense?: Array<{
      examples?: Array<{
        source?: { type?: string; value?: string };
        sentences?: Array<{ lang?: string; text?: string }>;
      }>;
    }>;
  }>;
}): ExamplePair[] {
  const out: ExamplePair[] = [];
  for (const w of doc.words ?? []) {
    for (const s of w.sense ?? []) {
      for (const e of s.examples ?? []) {
        if (e.source?.type !== "tatoeba" || !e.source.value) continue;
        const jpn = e.sentences?.find((x) => x.lang === "jpn")?.text;
        const eng = e.sentences?.find((x) => x.lang === "eng")?.text;
        if (jpn && eng) {
          out.push({ wordId: w.id ?? "", tatoebaId: e.source.value, jpn, eng });
        }
      }
    }
  }
  return out;
}

/** KanjiVG per-glyph SVG URL for a single character. */
export function kanjiVgUrl(glyph: string): string {
  const code = glyph.codePointAt(0);
  if (code === undefined) throw new Error("Empty glyph");
  return `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code
    .toString(16)
    .padStart(5, "0")}.svg`;
}

/** Host allowlist: ingest refuses any URL outside these (no proprietary sources). */
const ALLOWED_HOSTS = [
  "www.edrdg.org",
  "ftp.edrdg.org",
  "github.com",
  "raw.githubusercontent.com",
  "downloads.tatoeba.org",
];

export function assertAllowedUrl(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Not a valid URL: ${url}`);
  }
  if (!ALLOWED_HOSTS.includes(host)) {
    throw new Error(
      `URL host not on the open-source allowlist: ${host} (refusing ${url})`,
    );
  }
}
