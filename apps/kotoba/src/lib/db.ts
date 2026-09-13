"use client";

import Dexie, { type Table } from "dexie";
import type { Entry, Example } from "./types";

class KotobaDb extends Dexie {
  entries!: Table<Entry, number>;
  examples!: Table<Example, number>;

  constructor() {
    super("kotoba");
    this.version(1).stores({
      entries: "++id, key, surface, mastery, jlpt, isFavorite, dueAt, frequencyRank, suspended",
      examples: "++id, entryId",
    });
    // v2: examples carry the JLPT level they were generated at.
    this.version(2).stores({
      entries: "++id, key, surface, mastery, jlpt, isFavorite, dueAt, frequencyRank, suspended",
      examples: "++id, entryId, level",
    });
  }
}

export const db = new KotobaDb();

export async function getDueEntries(limit = 50, favoriteOnly = false): Promise<Entry[]> {
  const now = Date.now();
  let col = db.entries.where("dueAt").belowOrEqual(now).and((e) => !e.suspended && !e.blacklisted);
  if (favoriteOnly) col = col.and((e) => e.isFavorite);
  const due = await col.sortBy("dueAt");
  // favorites float to top, then frequency rank
  due.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return (a.frequencyRank ?? 999999) - (b.frequencyRank ?? 999999);
  });
  return due.slice(0, limit);
}
