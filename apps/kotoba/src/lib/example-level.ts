import type { Jlpt } from "./types";

export const EXAMPLE_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type ExampleLevel = (typeof EXAMPLE_LEVELS)[number];
export type ExampleLevelPreference = ExampleLevel | "auto";

const STORAGE_KEY = "kotoba.exampleLevel";
export const DEFAULT_EXAMPLE_LEVEL: ExampleLevel = "N5";

/** Server + client safe: coerce unknown input to a valid level, default N5. */
export function parseExampleLevel(input: unknown): ExampleLevel {
  return typeof input === "string" && (EXAMPLE_LEVELS as readonly string[]).includes(input)
    ? (input as ExampleLevel)
    : DEFAULT_EXAMPLE_LEVEL;
}

/**
 * Resolve which level to request:
 * explicit user preference wins, else the entry's own JLPT, else N5.
 */
export function resolveExampleLevel(entryJlpt: Jlpt | undefined, preference: ExampleLevelPreference): ExampleLevel {
  if (preference !== "auto") return preference;
  return entryJlpt && entryJlpt !== "unknown" ? entryJlpt : DEFAULT_EXAMPLE_LEVEL;
}

export function getExampleLevelPreference(): ExampleLevelPreference {
  if (typeof localStorage === "undefined") return "auto";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "auto" || (typeof raw === "string" && (EXAMPLE_LEVELS as readonly string[]).includes(raw))) {
    return raw as ExampleLevelPreference;
  }
  return "auto";
}

export function setExampleLevelPreference(p: ExampleLevelPreference): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, p);
}
