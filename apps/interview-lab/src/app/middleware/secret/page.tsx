export const metadata = { title: "Secret (Middleware guarded)" };

export default function Page() {
  return (
    <div className="rounded-xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-bold">Secret area — you passed middleware</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Middleware allowed you because <code>?allow=1</code> or cookie <code>lab_allow=1</code>. Remove the query to
        see the redirect.
      </p>
      <a href="/middleware" className="mt-4 inline-block text-sm underline">
        Back
      </a>
    </div>
  );
}
