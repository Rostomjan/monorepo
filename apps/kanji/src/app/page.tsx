import { AccuracyStat, LevelCard, ReviewForecast, SubjectCounts } from "@repo/ui";
import { DashboardLive } from "../components/dashboard-live";

const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

const EMPTY_SUBJECTS = { total: 0, radical: 0, kanji: 0, vocabulary: 0 };

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold">kanji</h1>
      {hasBackend ? (
        <DashboardLive />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 w-full max-w-3xl">
          <LevelCard level={null} />
          <AccuracyStat accuracy={null} />
          <ReviewForecast
            forecast={{ apprentice: 0, guru: 0, master: 0, enlightened: 0 }}
          />
          <SubjectCounts counts={EMPTY_SUBJECTS} />
        </div>
      )}
      {!hasBackend && (
        <p className="text-zinc-500 text-sm max-w-md text-center">
          No backend connected. Set NEXT_PUBLIC_CONVEX_URL and seed content to
          begin.
        </p>
      )}
    </main>
  );
}
