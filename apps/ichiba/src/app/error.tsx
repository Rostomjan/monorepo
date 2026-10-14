"use client";

// Route-level boundary (Sentry 7766142040): a Server Component throw renders
// this with a retry instead of a dead digest-only crash page.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-6">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm" role="alert">
        <p className="font-semibold text-ink">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">
          This page hit an unexpected error. Your cart and orders are safe.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-brand hover:bg-brand-deep"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
