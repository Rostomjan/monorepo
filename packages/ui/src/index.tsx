"use client";

import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = ({ children, className, ...props }: ButtonProps) => {
  return (
    <button
      className={`px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export interface LevelCardProps {
  level: number | null;
}

export const LevelCard = ({ level }: LevelCardProps) => {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Level
      </h2>
      <p className="text-4xl font-bold mt-1">{level ?? "—"}</p>
    </section>
  );
};

export interface ReviewForecastProps {
  forecast: {
    apprentice: number;
    guru: number;
    master: number;
    enlightened: number;
  };
}

const FORECAST_ROWS: Array<{ key: keyof ReviewForecastProps["forecast"]; label: string }> = [
  { key: "apprentice", label: "Apprentice" },
  { key: "guru", label: "Guru" },
  { key: "master", label: "Master" },
  { key: "enlightened", label: "Enlightened" },
];

export const ReviewForecast = ({ forecast }: ReviewForecastProps) => {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Review forecast
      </h2>
      <dl className="mt-2 space-y-1">
        {FORECAST_ROWS.map(({ key, label }) => (
          <div key={key} className="flex justify-between text-sm">
            <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="font-semibold">{forecast[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export interface AccuracyStatProps {
  accuracy: number | null;
}

export const AccuracyStat = ({ accuracy }: AccuracyStatProps) => {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Accuracy
      </h2>
      <p className="text-4xl font-bold mt-1">
        {accuracy === null ? "—" : `${Math.round(accuracy * 100)}%`}
      </p>
      {accuracy === null && (
        <p className="text-sm text-zinc-500 mt-1">No reviews yet.</p>
      )}
    </section>
  );
};

export interface SubjectCountsProps {
  counts: {
    total: number;
    radical: number;
    kanji: number;
    vocabulary: number;
  };
}

export const SubjectCounts = ({ counts }: SubjectCountsProps) => {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Subjects
      </h2>
      <p className="text-4xl font-bold mt-1">{counts.total}</p>
      <p className="text-sm text-zinc-500 mt-1">
        {counts.radical} radicals · {counts.kanji} kanji · {counts.vocabulary}{" "}
        vocab
      </p>
    </section>
  );
};

export interface LessonCardProps {
  glyph: string;
  type: string;
  meanings: string[];
  readings: string[];
  mnemonic: string;
}

export const LessonCard = ({ glyph, type, meanings, readings, mnemonic }: LessonCardProps) => {
  return (
    <article className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-xl">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{type}</p>
      <p className="text-7xl text-center my-4">{glyph}</p>
      <p className="text-lg font-semibold">{meanings.join(", ")}</p>
      {readings.length > 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">{readings.join(", ")}</p>
      )}
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">{mnemonic}</p>
    </article>
  );
};

export interface LessonQuizProps {
  glyph: string;
  prompt: string;
  onAnswer: (answer: string) => void;
}

export const LessonQuiz = ({ glyph, prompt, onAnswer }: LessonQuizProps) => {
  return (
    <form
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onAnswer(String(data.get("answer") ?? ""));
        e.currentTarget.reset();
      }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Quiz · {prompt}
      </p>
      <p className="text-7xl text-center my-4">{glyph}</p>
      <input
        name="answer"
        autoComplete="off"
        placeholder={`type the ${prompt}…`}
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
      />
      <button
        type="submit"
        className="mt-3 px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity"
      >
        Answer
      </button>
    </form>
  );
};
