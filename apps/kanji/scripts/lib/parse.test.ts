import { describe, expect, test } from "bun:test";
import {
  assertAllowedUrl,
  extractCommonVocab,
  extractExamples,
  kanjiVgUrl,
  parseCsv,
  parseKanjiAliveRadicals,
  parseKradfile,
} from "./parse";

describe("parseKradfile", () => {
  test("parses entries, skips comments and blanks", () => {
    const entries = parseKradfile("# comment\n\n一 : ー\n丁 : 一 亅\n");
    expect(entries).toEqual([
      { kanji: "一", components: ["ー"] },
      { kanji: "丁", components: ["一", "亅"] },
    ]);
  });

  test("rejects malformed lines", () => {
    expect(() => parseKradfile("no colon here")).toThrow(/Unparseable/);
  });
});

describe("parseCsv", () => {
  test("handles quotes, commas, escaped quotes", () => {
    const rows = parseCsv('a,"b, c","d""e"\n1,2,3\n');
    expect(rows).toEqual([
      ["a", "b, c", 'd"e'],
      ["1", "2", "3"],
    ]);
  });
});

describe("parseKanjiAliveRadicals", () => {
  test("maps columns by header", () => {
    const body =
      "Stroke#,Radical,Meaning,Reading,Reading-R,Position-J,Position-R,Importance,Origin,Variant-of,Variant-of-Reading\n" +
      '1,⼀,"one, horizontal stroke",いち,ichi,,,,Kangxi,,\n';
    expect(parseKanjiAliveRadicals(body)).toEqual([
      {
        stroke: "1",
        glyph: "⼀",
        meaning: "one, horizontal stroke",
        reading: "いち",
        readingRomaji: "ichi",
      },
    ]);
  });

  test("rejects missing columns", () => {
    expect(() => parseKanjiAliveRadicals("A,B\n1,2\n")).toThrow(/missing column/);
  });
});

describe("extractCommonVocab", () => {
  test("keeps common kanji forms with preferred readings", () => {
    const out = extractCommonVocab({
      words: [
        {
          id: "1",
          kanji: [{ common: true, text: "休み" }],
          kana: [{ common: true, text: "やすみ", appliesToKanji: ["*"] }],
          sense: [{ gloss: [{ lang: "eng", text: "rest" }, { lang: "eng", text: "holiday" }] }],
        },
        {
          id: "2",
          kanji: [{ common: false, text: "稀有" }],
          kana: [{ text: "けう" }],
          sense: [{ gloss: [{ lang: "eng", text: "rare" }] }],
        },
      ],
    });
    expect(out).toEqual([
      { id: "1", text: "休み", reading: "やすみ", glosses: ["rest", "holiday"] },
    ]);
  });

  test("resolves readings via appliesToKanji", () => {
    const out = extractCommonVocab({
      words: [
        {
          id: "3",
          kanji: [
            { common: true, text: "入口" },
            { common: true, text: "入り口" },
          ],
          kana: [
            { common: true, text: "いりぐち", appliesToKanji: ["入口", "入り口"] },
            { common: false, text: "いりくち", appliesToKanji: ["入口"] },
          ],
          sense: [{ gloss: [{ lang: "eng", text: "entrance" }] }],
        },
      ],
    });
    expect(out.map((e) => [e.text, e.reading])).toEqual([
      ["入口", "いりぐち"],
      ["入り口", "いりぐち"],
    ]);
  });
});
describe("kanjiVgUrl", () => {
  test("builds zero-padded codepoint URL", () => {
    expect(kanjiVgUrl("一")).toBe(
      "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/04e00.svg",
    );
  });
});

describe("extractExamples", () => {
  test("flattens Tatoeba jpn/eng pairs, skips incomplete ones", () => {
    const out = extractExamples({
      words: [
        {
          id: "1000110",
          sense: [
            {
              examples: [
                {
                  source: { type: "tatoeba", value: "162365" },
                  sentences: [
                    { lang: "jpn", text: "私は得ました。" },
                    { lang: "eng", text: "I got it." },
                  ],
                },
                {
                  source: { type: "other", value: "1" },
                  sentences: [
                    { lang: "jpn", text: "×" },
                    { lang: "eng", text: "×" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(out).toEqual([
      { wordId: "1000110", tatoebaId: "162365", jpn: "私は得ました。", eng: "I got it." },
    ]);
  });
});

describe("assertAllowedUrl", () => {
  test("allows open upstreams, refuses anything else", () => {
    expect(() =>
      assertAllowedUrl("http://www.edrdg.org/kanjidic/kanjidic2.xml.gz"),
    ).not.toThrow();
    expect(() => assertAllowedUrl("https://www.wanikani.com/kanji")).toThrow(
      /allowlist/,
    );
    expect(() => assertAllowedUrl("not a url")).toThrow(/valid URL/);
  });
});
