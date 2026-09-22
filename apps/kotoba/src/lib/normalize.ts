export function normalizeSurface(s: string): string {
  return s.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function entryKey(surface: string, reading: string): string {
  return `${normalizeSurface(surface)}｜${normalizeSurface(reading) || normalizeSurface(surface)}`;
}

export function detectKind(surface: string): "word" | "phrase" {
  const s = normalizeSurface(surface);
  if (/[、。！？!?…\s]/.test(s) || s.length > 12) return "phrase";
  return "word";
}

/** Sentence-like phrase: full sentences skip auto LLM/template examples, translation only. */
export function isSentenceLike(surface: string): boolean {
  const s = normalizeSurface(surface);
  return s.length > 8 || /[、。！？!?…\s]/.test(s);
}
