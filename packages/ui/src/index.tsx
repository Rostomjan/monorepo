"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

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

export interface ProductCardProps {
  shopName: string;
  name: string;
  href: string;
  priceLabel: string;
  stockText: string;
  /** Optional short description line under the title (Figma card body). */
  description?: string;
  /** Optional struck-through compare-at price, e.g. "¥5,800". */
  compareAtLabel?: string;
  /** Overlay badge on the media tile, e.g. "TOKYO CRAFT". */
  badge?: string;
  /** Right-side dispatch note, e.g. "Dispatch: 24h". */
  dispatchText?: string;
  /** Low-stock styling (amber) instead of the default green. */
  lowStock?: boolean;
  /** Optional add-to-cart slot rendered as the card CTA. App wires the logic. */
  action?: ReactNode;
}

// Presentational product card (Ichiba storefront, Figma "Article - CARD").
// No app logic, no data fetching — the host app passes pre-formatted labels,
// routing href, and an optional `action` node for the Add to Cart CTA.
export const ProductCard = ({
  shopName,
  name,
  href,
  priceLabel,
  stockText,
  description,
  compareAtLabel,
  badge,
  dispatchText = "Dispatch: 24h",
  lowStock = false,
  action,
}: ProductCardProps) => {
  return (
    <article className="flex flex-col rounded-xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_1px_3px_rgb(0_0_0/0.1)]">
      <div className="relative rounded-lg bg-strip">
        <div className="aspect-[4/3] w-full" aria-hidden />
        {badge && (
          <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[11px] font-bold tracking-wide text-nav shadow-sm backdrop-blur">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        {shopName}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="fill-muted">
          <path d="M3.5 2 6.5 5 3.5 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </p>
      <a href={href} className="mt-1 block text-base font-semibold text-ink hover:underline">
        {name}
      </a>
      {description && <p className="mt-1 line-clamp-1 text-[13px] text-muted">{description}</p>}

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xl font-bold text-ink">{priceLabel}</span>
        {compareAtLabel && <s className="text-[13px] text-muted">{compareAtLabel}</s>}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <StockBadge text={stockText} tone={lowStock ? "low" : "ok"} />
        <span className="text-[13px] text-muted">{dispatchText}</span>
      </div>

      {action ?? (
        <a
          href={href}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-strip px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-filter-active"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="fill-current">
            <path d="M2 3h2l2.4 8.2a1 1 0 0 0 1 .8h6.9a1 1 0 0 0 1-.8L17 7H6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1 -1)" />
            <circle cx="6.5" cy="13.5" r="1.2" />
            <circle cx="13.5" cy="13.5" r="1.2" />
          </svg>
          Add to Cart
        </a>
      )}
    </article>
  );
};

export interface StockBadgeProps {
  text: string;
  tone?: "ok" | "low" | "out";
}

// Presentational stock pill (Figma "Inventory Status"). Color-only, no logic.
export const StockBadge = ({ text, tone = "ok" }: StockBadgeProps) => {
  const dot = tone === "ok" ? "bg-success-dot" : tone === "low" ? "bg-[#b54708]" : "bg-brand-deep";
  const fg = tone === "ok" ? "text-success" : tone === "low" ? "text-[#b54708]" : "text-brand-deep";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold ${fg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {text}
    </span>
  );
};

export interface FilterPillProps {
  label: string;
  count?: number;
  active?: boolean;
  href: string;
}

// Presentational shop-filter pill (Figma "Shop Filter Tags Pill Rail").
// Anchor-styled so the host app's routing stays in the app layer.
export const FilterPill = ({ label, count, active = false, href }: FilterPillProps) => {
  return (
    <a
      href={href}
      aria-current={active || undefined}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-brand shadow-sm"
          : "inline-flex items-center gap-2 rounded-full bg-pill px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-filter-active hover:text-ink"
      }
    >
      {label}
      {count !== undefined && (
        <span
          className={
            active
              ? "rounded-full bg-white/25 px-1.5 text-[11px] font-semibold"
              : "rounded-full bg-white/70 px-1.5 text-[11px]"
          }
        >
          {count}
        </span>
      )}
    </a>
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

export interface QuizPromptProps {
  glyph: string;
  prompt: string;
  onAnswer: (answer: string) => void;
}

export const QuizPrompt = ({ glyph, prompt, onAnswer }: QuizPromptProps) => {
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
      <p data-testid="quiz-glyph" className="text-7xl text-center my-4">{glyph}</p>
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

export interface WrapUpRow {
  glyph: string;
  halves: string;
  from: number;
  to: number;
}
export const WrapUpTable = ({ rows }: { rows: WrapUpRow[] }) => {
  return (
    <table data-testid="wrap-up" className="w-full max-w-xl border-collapse">
      <thead>
        <tr className="text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
          <th className="border border-zinc-200 dark:border-zinc-800 p-2">Item</th>
          <th className="border border-zinc-200 dark:border-zinc-800 p-2">Halves</th>
          <th className="border border-zinc-200 dark:border-zinc-800 p-2">Stage</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.glyph}>
            <td className="border border-zinc-200 dark:border-zinc-800 p-2 text-2xl">
              {row.glyph}
            </td>
            <td className="border border-zinc-200 dark:border-zinc-800 p-2 text-sm">
              {row.halves}
            </td>
            <td className="border border-zinc-200 dark:border-zinc-800 p-2 font-semibold">
              {row.from} {row.to > row.from ? "↑" : row.to < row.from ? "↓" : "→"} {row.to}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export interface LeechItem {
  glyph: string;
  type: string;
}

export const LeechList = ({ leeches }: { leeches: LeechItem[] }) => {
  if (leeches.length === 0) return null;
  return (
    <section className="rounded-lg border border-amber-300 dark:border-amber-800 p-4 w-full max-w-3xl">
      <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
        Leeches
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {leeches.map((l) => (
          <li
            key={l.glyph}
            className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-xl"
            title={l.type}
          >
            {l.glyph}
          </li>
        ))}
      </ul>
    </section>
  );
};
