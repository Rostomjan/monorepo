import { normalizeSurface } from "./normalize";

export interface ParsedLine {
  surface: string;
  reading?: string;
  meaning?: string;
  jlpt?: string;
  tags?: string[];
}

/** Tolerant parser: CSV/TSV/; rows, "[reading]" brackets, " - " splits, or bare JP. */
export function parsePastedText(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim().replace(/^\d+[.)\s]+/, "");
    if (!line) continue;
    // CSV-ish with comma/semicolon/tab and 2+ cols
    const cells = line.split(/[,;\t]/).map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      out.push({
        surface: normalizeSurface(cells[0]),
        reading: cells[1] ? normalizeSurface(cells[1]) : undefined,
        meaning: cells[2] ? normalizeSurface(cells.slice(2).join(", ")) : undefined,
        jlpt: cells[3],
      });
      continue;
    }
    // surface [reading] - meaning  / surface（reading）meaning
    const bracket = line.match(/^(.+?)\s*[［\[\(（]\s*(.+?)\s*[］\]\)）]\s*[-–—:：]?\s*(.*)$/);
    if (bracket) {
      out.push({
        surface: normalizeSurface(bracket[1]),
        reading: normalizeSurface(bracket[2]),
        meaning: bracket[3]?.trim() ? normalizeSurface(bracket[3]) : undefined,
      });
      continue;
    }
    // surface - meaning
    const dash = line.match(/^(.+?)\s+[-–—:：]\s+(.+)$/);
    if (dash && /[\u3040-\u30ff\u4e00-\u9faf]/.test(dash[1])) {
      out.push({ surface: normalizeSurface(dash[1]), meaning: normalizeSurface(dash[2]) });
      continue;
    }
    out.push({ surface: normalizeSurface(line) });
    if (out.length >= 500) break;
  }
  return out;
}
