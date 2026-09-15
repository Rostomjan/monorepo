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
