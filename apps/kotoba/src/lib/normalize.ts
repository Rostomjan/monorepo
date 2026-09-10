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
