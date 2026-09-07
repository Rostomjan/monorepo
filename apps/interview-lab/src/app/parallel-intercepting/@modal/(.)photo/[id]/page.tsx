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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className={`flex h-40 items-center justify-center rounded-xl text-xl font-bold text-white ${p.color}`}>
          {p.title} — modal
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Intercepted via <code>@modal/(.)photo/[id]</code>. Background page stays mounted.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/parallel-intercepting" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">
            Close
          </Link>
          <Link
            href={`/parallel-intercepting/photo/${id}`}
            className="rounded-md border px-4 py-2 text-sm dark:border-zinc-700"
          >
            Open as page
          </Link>
        </div>
      </div>
    </div>
  );
}
