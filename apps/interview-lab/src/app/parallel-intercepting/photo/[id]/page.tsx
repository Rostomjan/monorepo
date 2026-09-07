import Link from "next/link";

const map: Record<string, { color: string; title: string }> = {
  "1": { color: "bg-indigo-500", title: "Indigo" },
  "2": { color: "bg-emerald-500", title: "Emerald" },
  "3": { color: "bg-rose-500", title: "Rose" },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = map[id] ?? { color: "bg-zinc-500", title: `Photo ${id}` };
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/parallel-intercepting" className="text-sm underline">
        ← Back
      </Link>
      <div className={`flex h-64 items-center justify-center rounded-2xl text-2xl font-bold text-white ${p.color}`}>
        {p.title} — full page
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This is the non-intercepted full page. You arrived via hard nav/refresh.
      </p>
    </div>
  );
}
