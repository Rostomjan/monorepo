"use client";

import { QuizPrompt, WrapUpTable } from "@repo/ui";
import { api } from "@repo/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  checkMeaningReview,
  checkReading,
  halvesFor,
  type Half,
  type MeaningVerdict,
} from "../lib/grading";

type Verdict = MeaningVerdict | "correct" | "wrong";

/** Round-robin interleave: every item's first half, then every second half. */
function interleave(itemCount: number, halvesOf: (i: number) => Half[]) {
  const perItem = Array.from({ length: itemCount }, (_, i) => halvesOf(i));
  const rounds = Math.max(...perItem.map((h) => h.length));
  const out: Array<{ item: number; half: Half }> = [];
  for (let r = 0; r < rounds; r++) {
    perItem.forEach((halves, i) => {
      if (halves[r]) out.push({ item: i, half: halves[r] });
    });
  }
  return out;
}

const MARK: Record<Verdict, string> = { correct: "✓", typo: "≈", wrong: "✗" };

interface WrapUpRow {
  glyph: string;
  halves: string;
  from: number;
  to: number;
}

export function ReviewRunner() {
  const queue = useQuery(api.kanjiReviews.getReviewQueue);
  const submit = useMutation(api.kanjiReviews.submitReviews);

  const [answered, setAnswered] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<number, Partial<Record<Half, Verdict>>>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [wrapUp, setWrapUp] = useState<WrapUpRow[] | null>(null);

  if (queue === undefined) return <p className="text-zinc-500">Loading reviews…</p>;
  type Item = (typeof queue)[number];
  const items = queue as Item[];
  if (items.length === 0 && !wrapUp) {
    return (
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">No reviews due.</p>
        <p className="text-zinc-500 text-sm">Finish lessons to feed the queue.</p>
      </div>
    );
  }

  if (wrapUp) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-xl font-semibold">Session wrap-up</h2>
        <WrapUpTable rows={wrapUp} />
      </div>
    );
  }
  if (grading) return <p className="text-zinc-500">Grading…</p>;

  const halves = interleave(items.length, (i) => halvesFor(items[i].subject.type));
  const current = halves[answered];
  const item = items[current.item];
  const acceptedMeanings = [...item.subject.meanings, ...item.synonyms];
  const accepted =
    current.half === "meaning"
      ? acceptedMeanings.join(" / ")
      : item.subject.readings.join(", ");

  const advance = (verdict: Verdict, pauseMs: number, note: string | null) => {
    const next = {
      ...verdicts,
      [current.item]: { ...verdicts[current.item], [current.half]: verdict },
    };
    setVerdicts(next);
    if (answered + 1 >= halves.length) {
      setGrading(true);
      const results = items.map((it, i) => {
        const v = next[i] ?? {};
        return {
          assignmentId: it.assignmentId,
          meaning: (v.meaning ?? "correct") as "correct" | "typo" | "wrong",
          reading: (v.reading ?? "correct") as "correct" | "typo" | "wrong",
        };
      });
      void submit({ results }).then(({ movements }) => {
        const byId = new Map(movements.map((m) => [String(m.assignmentId), m]));
        setWrapUp(
          items.map((it, i) => {
            const m = byId.get(String(it.assignmentId));
            const v = next[i] ?? {};
            return {
              glyph: it.subject.glyph,
              halves: halvesFor(it.subject.type)
                .map((h) => `${h} ${MARK[v[h] ?? "correct"]}`)
                .join(" / "),
              from: m?.from ?? 0,
              to: m?.to ?? 0,
            };
          }),
        );
      });
      return;
    }
    if (note) {
      setFeedback(note);
      setTimeout(() => {
        setFeedback(null);
        setAnswered(answered + 1);
      }, pauseMs);
    } else {
      setAnswered(answered + 1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-zinc-500">
        Prompt {answered + 1} of {halves.length} · {items.length} items
      </p>
      <QuizPrompt
        key={`${current.item}-${current.half}-${answered}`}
        glyph={item.subject.glyph}
        prompt={current.half}
        onAnswer={(answer) => {
          if (current.half === "meaning") {
            const verdict = checkMeaningReview(acceptedMeanings, answer);
            if (verdict === "wrong") {
              advance("wrong", 1600, `Not quite — accepted: ${accepted}`);
            } else if (verdict === "typo") {
              advance("typo", 900, "Close enough — typo forgiven, flagged for review.");
            } else {
              advance("correct", 0, null);
            }
          } else if (checkReading(item.subject.readings, answer)) {
            advance("correct", 0, null);
          } else {
            advance("wrong", 1600, `Not quite — accepted: ${accepted}`);
          }
        }}
      />
      {feedback && <p className="font-semibold text-amber-700">{feedback}</p>}
    </div>
  );
}
