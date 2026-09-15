"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export function ItemManager({ subjectId }: { subjectId: Id<"subjects"> }) {
  const data = useQuery(api.kanjiItems.getSubject, { subjectId });
  const saveSynonyms = useMutation(api.kanjiItems.setSynonyms);
  const resurrect = useMutation(api.kanjiItems.resurrect);
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (data === undefined) return <p className="text-zinc-500">Loading item…</p>;
  if (data === null) return <p className="text-zinc-500">Item not found.</p>;
  const { subject, assignment } = data;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl">
      <p className="text-7xl">{subject.glyph}</p>
      <p className="text-sm text-zinc-500">
        {subject.type} · level {subject.level}
        {assignment ? ` · stage ${assignment.stage}` : " · not started"}
        {assignment && assignment.guruFalls >= 3 ? " · leech" : ""}
      </p>
      <p className="text-lg font-semibold">{subject.meanings.join(", ")}</p>
      {subject.readings.length > 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">{subject.readings.join(", ")}</p>
      )}
      <p className="text-zinc-700 dark:text-zinc-300">{subject.mnemonic}</p>
      {assignment ? (
        <>
          <form
            className="w-full space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const synonyms = (draft ?? assignment.synonyms.join(", "))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              void saveSynonyms({ subjectId, synonyms }).then(() => {
                setNotice("Synonyms saved — they count in reviews.");
                setDraft(null);
              });
            }}
          >
            <label htmlFor="synonyms" className="text-sm text-zinc-500">
              Personal synonyms (comma-separated)
            </label>
            <input
              id="synonyms"
              value={draft ?? assignment.synonyms.join(", ")}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="extra meanings you accept…"
              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity"
            >
              Save synonyms
            </button>
          </form>
          {assignment.stage === 9 && (
            <button
              onClick={() => {
                void resurrect({ subjectId }).then(() =>
                  setNotice("Resurrected to Apprentice 1."),
                );
              }}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Resurrect to Apprentice 1
            </button>
          )}
          {notice && <p className="text-sm text-zinc-600">{notice}</p>}
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Complete this item&apos;s lesson to unlock synonyms and SRS state.
        </p>
      )}
    </div>
  );
}
