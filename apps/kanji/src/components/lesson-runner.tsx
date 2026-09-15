"use client";

import { LessonCard, QuizPrompt } from "@repo/ui";
import { api } from "@repo/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { checkMeaning, checkReading, halvesFor, type Half } from "../lib/grading";

export function LessonRunner() {
  const [batchSize, setBatchSize] = useState(5);
  const queue = useQuery(api.kanjiLessons.getLessonQueue, { limit: batchSize });
  const complete = useMutation(api.kanjiLessons.completeLessonBatch);

  const [studyIndex, setStudyIndex] = useState(0);
  const [quizQueue, setQuizQueue] = useState<Array<{ item: number; half: Half }> | null>(null);
  const [quizTotal, setQuizTotal] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<{ passed: number; failed: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (queue === undefined) return <p className="text-zinc-500">Loading lessons…</p>;
  if (queue.length === 0) {
    return (
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">No lessons available.</p>
        <p className="text-zinc-500 text-sm">Seed more content or finish reviews to unlock new items.</p>
      </div>
    );
  }
  const items = queue;
  type QueueItem = (typeof items)[number];

  if (result) {
    return (
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">Batch complete.</p>
        <p className="text-zinc-600">
          {result.passed} passed · {result.failed} failed
        </p>
        <p className="text-zinc-500 text-sm">Passed items entered SRS stage 1.</p>
      </div>
    );
  }

  // Quiz phase. Submission happens in the final answer's event handler,
  // never in render (render-time mutations double-fire under StrictMode).
  if (quizQueue) {
    if (submitted) return <p className="text-zinc-500">Grading…</p>;
    const current = quizQueue[0];
    const item: QueueItem = items[current.item];
    const accepted =
      current.half === "meaning" ? item.meanings.join(" / ") : item.readings.join(", ");
    const answerHalf = (answer: string) => {
      const ok =
        current.half === "meaning"
          ? checkMeaning(item.meanings, answer)
          : checkReading(item.readings, answer);
      const nextFailed = ok ? failed : new Set(failed).add(current.item);
      setFailed(nextFailed);
      if (quizQueue.length === 1) {
        setSubmitted(true);
        const results = items.map((it: QueueItem, i: number) => ({
          subjectId: it._id,
          passed: i === current.item ? ok : !nextFailed.has(i),
        }));
        void complete({ results }).then((r) => setResult(r));
        return;
      }
      if (!ok) {
        setFeedback(`Not quite — accepted: ${accepted}`);
        setTimeout(() => {
          setFeedback(null);
          setQuizQueue(quizQueue.slice(1));
        }, 1600);
      } else {
        setQuizQueue(quizQueue.slice(1));
      }
    };
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-zinc-500">
          Quiz {quizTotal - quizQueue.length + 1} of {quizTotal} · {failed.size} failed so far
        </p>
        <QuizPrompt
          key={`${current.item}-${current.half}`}
          glyph={item.glyph}
          prompt={current.half}
          onAnswer={answerHalf}
        />
        {feedback && <p className="text-red-600 font-semibold">{feedback}</p>}
      </div>
    );
  }

  // Study phase.
  const item = items[studyIndex];
  const last = studyIndex === items.length - 1;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor="batch-size" className="text-sm text-zinc-500">
          Batch size
        </label>
        <input
          id="batch-size"
          type="number"
          min={3}
          max={10}
          value={batchSize}
          onChange={(e) => {
            setBatchSize(Math.min(10, Math.max(3, Number(e.target.value) || 5)));
            setStudyIndex(0);
          }}
          className="w-16 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
        />
      </div>
      <p className="text-sm text-zinc-500">
        Study {studyIndex + 1} of {items.length}
      </p>
      <LessonCard
        glyph={item.glyph}
        type={item.type}
        meanings={item.meanings}
        readings={item.readings}
        mnemonic={item.mnemonic}
      />
      <button
        onClick={() => {
          if (last) {
            const qq: Array<{ item: number; half: Half }> = [];
            items.forEach((it: QueueItem, i: number) => {
              for (const half of halvesFor(it.type)) qq.push({ item: i, half });
            });
            setQuizTotal(qq.length);
            setQuizQueue(qq);
          } else {
            setStudyIndex(studyIndex + 1);
          }
        }}
        className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity"
      >
        {last ? "Start quiz" : "Next"}
      </button>
    </div>
  );
}
