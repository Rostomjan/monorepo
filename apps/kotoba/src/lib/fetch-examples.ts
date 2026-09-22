"use client";

import { db } from "./db";
import { countUnknown, templateExamples } from "./examples";
import { isSentenceLike } from "./normalize";
import { DEFAULT_EXAMPLE_LEVEL, type ExampleLevel } from "./example-level";
import { shouldAttemptOnlineUpgrade } from "./network";
import type { Entry } from "./types";

export interface RankedExample {
  jp: string;
  en?: string;
  unknownCount: number;
  source: "template" | "llm" | "bundled";
}

const TTL_MS = 30 * 86_400_000;

/** Offline-first examples: Dexie cache → instant templates → background LLM upgrade. */
export async function getExamples(
  entry: Entry,
  knownSurfaces: Set<string>,
  level: ExampleLevel = DEFAULT_EXAMPLE_LEVEL,
): Promise<{ examples: RankedExample[]; upgraded: boolean }> {
  if (isSentenceLike(entry.surface)) return { examples: [], upgraded: true };
  const templates: RankedExample[] = templateExamples(entry).map((t) => ({
    ...t,
    unknownCount: countUnknown(t.jp, knownSurfaces, entry.surface),
    source: "template" as const,
  }));
  if (!entry.id) return { examples: templates, upgraded: false };

  const cached = await db.examples.where("entryId").equals(entry.id).sortBy("unknownCount");
  // Legacy rows predate level tagging — treat them as N5.
  const fresh = cached.filter(
    (c) => Date.now() - c.cachedAt < TTL_MS && c.source === "llm" && (c.level ?? DEFAULT_EXAMPLE_LEVEL) === level,
  );
  if (fresh.length > 0) {
    const merged = [
      ...fresh.map((c) => ({ jp: c.jp, en: c.en, unknownCount: c.unknownCount, source: "llm" as const })),
      ...templates,
    ].sort((a, b) => a.unknownCount - b.unknownCount || a.jp.length - b.jp.length);
    return { examples: merged.slice(0, 4), upgraded: true };
  }
  return { examples: templates, upgraded: false };
}

/** Fire-and-forget LLM upgrade. Returns fresh examples or null (offline/failure = keep templates). */
export async function upgradeExamples(
  entry: Entry,
  knownSurfaces: Set<string>,
  level: ExampleLevel = DEFAULT_EXAMPLE_LEVEL,
): Promise<RankedExample[] | null> {
  if (!entry.id) return null;
  if (isSentenceLike(entry.surface)) return null;
  if (!shouldAttemptOnlineUpgrade()) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch("/api/examples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface: entry.surface, meaning: entry.meaning, level }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const { examples } = (await res.json()) as { examples?: { jp: string; en?: string }[] };
    if (!examples?.length) return null;
    const now = Date.now();
    const ranked: RankedExample[] = examples.slice(0, 3).map((c) => ({
      jp: c.jp,
      en: c.en,
      unknownCount: countUnknown(c.jp, knownSurfaces, entry.surface),
      source: "llm" as const,
    }));
    const staleIds = (await db.examples.where("entryId").equals(entry.id).toArray())
      .filter((c) => (c.level ?? DEFAULT_EXAMPLE_LEVEL) === level)
      .map((c) => c.id)
      .filter((id): id is number => typeof id === "number");
    if (staleIds.length > 0) await db.examples.bulkDelete(staleIds);
    await db.examples.bulkAdd(
      ranked.map((r) => ({
        entryId: entry.id!,
        jp: r.jp,
        en: r.en,
        unknownCount: r.unknownCount,
        source: "llm" as const,
        cachedAt: now,
        level,
      })),
    );
    return ranked;
  } catch {
    return null;
  }
}
