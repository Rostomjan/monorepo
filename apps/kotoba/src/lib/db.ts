"use client";

import Dexie, { type Table } from "dexie";
import { mergeEntries } from "./dedupe";
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
    // v3: key is unique (was plain index). Upgrade folds pre-existing
    // duplicates — without this the unique index creation would fail on
    // databases that already contain dupes.
    this.version(3)
      .stores({
        entries: "++id, &key, surface, mastery, jlpt, isFavorite, dueAt, frequencyRank, suspended",
        examples: "++id, entryId, level",
      })
      .upgrade(async (tx) => {
        const table = tx.table<Entry, number>("entries");
        const survivors = new Map<string, Entry>();
        const dupeIds: number[] = [];
        await table.orderBy("createdAt").each((e) => {
          const prev = survivors.get(e.key);
          if (!prev) {
            survivors.set(e.key, e);
          } else {
            survivors.set(e.key, { ...mergeEntries(prev, e), id: prev.id });
            if (e.id !== undefined) dupeIds.push(e.id);
          }
        });
        await table.bulkPut([...survivors.values()]);
        await table.bulkDelete(dupeIds);
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
