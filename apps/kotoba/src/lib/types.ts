type EntryKind = "word" | "phrase";
type Mastery = "unknown" | "learning" | "known";
export type Jlpt = "N5" | "N4" | "N3" | "N2" | "N1" | "unknown";

export interface Entry {
  id?: number;
  /** normalized surface+reading key for dedupe */
  key: string;
  surface: string;
  reading: string;
  meaning: string;
  altMeanings?: string[];
  kind: EntryKind;
  jlpt: Jlpt;
  tags?: string[];
  frequencyRank?: number;
  pitch?: string;
  mastery: Mastery;
  suspended?: boolean;
  blacklisted?: boolean;
  isFavorite: boolean;
  favoritedAt?: number;
  needsReview?: boolean;
  source: "paste" | "csv" | "manual" | "seed";
  createdAt: number;
  dueAt: number;
  intervalDays: number;
}

export interface Example {
  id?: number;
  entryId: number;
  jp: string;
  reading?: string;
  en?: string;
  unknownCount: number;
  source: "template" | "bundled" | "llm";
  cachedAt: number;
  /** JLPT level the LLM sentence was generated at. Absent = legacy N5 rows. */
  level?: Jlpt;
}

export type Grade = "again" | "hard" | "known";

export interface DictRecord {
  k: string;
  r: string;
  g: string[];
  j: Jlpt | 0;
  f?: number;
  p?: string;
}
