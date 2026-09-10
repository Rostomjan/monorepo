import type { Entry, Grade } from "./types";

const DAY = 86_400_000;

export function nextReview(entry: Entry, grade: Grade, now = Date.now()) {
  let interval = entry.intervalDays || 1;
  let mastery = entry.mastery;
  if (grade === "again") {
    interval = 1;
    mastery = "unknown";
  } else if (grade === "hard") {
    interval = Math.max(1, Math.round(interval * 1.2)) || 3;
    mastery = "learning";
  } else {
    interval = entry.mastery === "known" ? Math.min(180, interval * 2) : entry.mastery === "learning" ? 7 : 3;
    mastery = interval >= 7 ? "known" : "learning";
  }
  return { intervalDays: interval, dueAt: now + interval * DAY, mastery };
}
