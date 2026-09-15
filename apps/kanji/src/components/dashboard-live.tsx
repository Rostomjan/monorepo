"use client";

import { AccuracyStat, LeechList, LevelCard, ReviewForecast, SubjectCounts } from "@repo/ui";
import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export function DashboardLive() {
  const data = useQuery(api.kanjiDashboard.getDashboard);

  if (data === undefined) {
    return <p className="text-zinc-500">Loading dashboard…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-3xl">
        <LevelCard level={data.level} />
        <AccuracyStat accuracy={data.accuracy} />
        <ReviewForecast forecast={data.forecast} />
        <SubjectCounts counts={data.subjects} />
      </div>
      <LeechList leeches={data.leeches} />
    </div>
  );
}
