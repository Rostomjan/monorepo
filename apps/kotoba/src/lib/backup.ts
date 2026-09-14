"use client";

import { db } from "./db";
import { isConstraintError } from "./dedupe";
import { entryKey } from "./normalize";
import type { Entry } from "./types";

const BACKUP_VERSION = 1;

export async function exportBackup(): Promise<void> {
  const entries = await db.entries.toArray();
  const payload = { app: "kotoba", version: BACKUP_VERSION, date: new Date().toISOString(), entries };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kotoba-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ added: number; skipped: number }> {
  const text = await file.text();
  const parsed = JSON.parse(text) as { app?: string; entries?: Entry[] };
  if (!Array.isArray(parsed.entries)) throw new Error("not a kotoba backup (missing entries[])");
  const existing = new Set((await db.entries.toArray()).map((e) => e.key));
  let added = 0;
  let skipped = 0;
  const now = Date.now();
  for (const raw of parsed.entries.slice(0, 5000)) {
    if (!raw.surface) {
      skipped++;
      continue;
    }
    const key = raw.key || entryKey(raw.surface, raw.reading ?? raw.surface);
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    existing.add(key);
    const { id: _drop, ...rest } = raw;
    try {
      await db.entries.add({ ...rest, key, createdAt: raw.createdAt ?? now, dueAt: raw.dueAt ?? now, intervalDays: raw.intervalDays ?? 1 } as Entry);
      added++;
    } catch (err) {
      if (!isConstraintError(err)) throw err;
      skipped++;
    }
  }
  return { added, skipped };
}
