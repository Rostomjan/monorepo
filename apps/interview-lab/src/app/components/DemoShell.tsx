import Link from "next/link";

export function DemoShell({
  title,
  intro,
  demo,
  code,
  interview,
}: {
  title: string;
  intro: string;
  demo: React.ReactNode;
  code: React.ReactNode;
  interview: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Dashboard
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{intro}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">{demo}</div>
        <div className="space-y-4">{code}</div>
      </div>
      <div>{interview}</div>
    </div>
  );
}
