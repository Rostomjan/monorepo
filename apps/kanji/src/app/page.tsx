import { AccuracyStat, LevelCard, ReviewForecast } from "@repo/ui";
import { DashboardLive } from "../components/dashboard-live";

const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold">kanji</h1>
      {hasBackend ? (
        <DashboardLive />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 w-full max-w-3xl">
          <LevelCard level={null} />
          <ReviewForecast
            forecast={{ apprentice: 0, guru: 0, master: 0, enlightened: 0 }}
          />
          <AccuracyStat accuracy={null} />
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
