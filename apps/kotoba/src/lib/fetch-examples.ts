"use client";

import { db } from "./db";
import { countUnknown, templateExamples } from "./examples";
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
): Promise<{ examples: RankedExample[]; upgraded: boolean }> {
  const templates: RankedExample[] = templateExamples(entry).map((t) => ({
    ...t,
    unknownCount: countUnknown(t.jp, knownSurfaces, entry.surface),
    source: "template" as const,
  }));
  if (!entry.id) return { examples: templates, upgraded: false };

  const cached = await db.examples.where("entryId").equals(entry.id).sortBy("unknownCount");
  const fresh = cached.filter((c) => Date.now() - c.cachedAt < TTL_MS && c.source === "llm");
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
): Promise<RankedExample[] | null> {
  if (!entry.id) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch("/api/examples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface: entry.surface, meaning: entry.meaning }),
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
    await db.examples.where("entryId").equals(entry.id).delete();
    await db.examples.bulkAdd(
      ranked.map((r) => ({ entryId: entry.id!, jp: r.jp, en: r.en, unknownCount: r.unknownCount, source: "llm" as const, cachedAt: now })),
    );
    return ranked;
  } catch {
    return null;
  }
}
