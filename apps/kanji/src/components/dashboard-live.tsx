"use client";

import { AccuracyStat, LevelCard, ReviewForecast } from "@repo/ui";
import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export function DashboardLive() {
  const data = useQuery(api.kanjiDashboard.getDashboard);

  if (data === undefined) {
    return <p className="text-zinc-500">Loading dashboard…</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3 w-full max-w-3xl">
      <LevelCard level={data.level} />
      <ReviewForecast forecast={data.forecast} />
      <AccuracyStat accuracy={data.accuracy} />
    </div>
  );
}
