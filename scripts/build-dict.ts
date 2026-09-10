// Build-time only: fetch JMDict-Extended eng-common and emit compact dict.
// Usage: bun scripts/build-dict.ts  (writes apps/kotoba/src/data/dict-compact.json)
// Zero runtime cost. Requires network only when refreshing the snapshot.
const OUT = new URL("../apps/kotoba/src/data/dict-compact.json", import.meta.url);
const META = new URL("../apps/kotoba/src/data/dict-meta.json", import.meta.url);
const SRC = "https://github.com/scriptin/jmdict-simplified/releases/latest";

console.log(`kotoba dict:update\n  source: ${SRC} (eng-common) + JMDict_Extended JLPT/furigana/frequency/pitch`);
console.log(`  out: ${OUT.pathname}`);
console.log("TODO: wire fetch+join when refreshing beyond hand-seed v1. See apps/kotoba/CONTEXT.md.");
await Bun.write(META, JSON.stringify({ note: "hand-seed v1; run full fetch to refresh" }, null, 2));
