import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { revalidateDemoTag, revalidateDemoPath } from "./actions";

export const metadata = { title: "Caching & Revalidation" };

async function getDemoTime() {
  // Tag-based cache — revalidatable via revalidateTag("demo-time")
  const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", {
    // Fallback if external API fails — we still demo tags
    next: { tags: ["demo-time"], revalidate: 60 },
  }).catch(() => null);

  if (res && res.ok) {
    const j = (await res.json()) as { datetime: string };
    return j.datetime;
  }
  // Fallback: cached time via render
  return new Date().toISOString();
}

export default async function Page() {
  const t = await getDemoTime();

  return (
    <DemoShell
      title="Caching & Revalidation"
      intro="Next caches fetch by default (in RSC). Control it with revalidate, tags, revalidateTag/revalidatePath, and Next 16 use cache / cacheLife."
      demo={
        <>
          <DemoCard title="Cached fetch (tag: demo-time)">
            <div className="font-mono text-xs break-all rounded bg-zinc-50 p-3 dark:bg-zinc-800">{t}</div>
            <p className="mt-2 text-xs text-zinc-500">
              Fetched with <code>next: &#123; tags: [&quot;demo-time&quot;], revalidate: 60 &#125;</code>. Hit refresh — value
              stays cached for 60s until revalidated.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={revalidateDemoTag}>
                <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                  revalidateTag(&quot;demo-time&quot;)
                </button>
              </form>
              <form action={revalidateDemoPath}>
                <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  revalidatePath(&quot;/caching&quot;)
                </button>
              </form>
            </div>
          </DemoCard>
          <DemoCard title="Cache layers (interview cheat-sheet)">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <b>Request memo</b> — same fetch in one render deduped.
              </li>
              <li>
                <b>Data cache</b> — persists across requests (tags/revalidate).
              </li>
              <li>
                <b>Full route cache</b> — statically rendered HTML.
              </li>
              <li>
                <b>Router cache</b> — client nav cache (soft nav).
              </li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// Cached (default)
await fetch(url, { next: { tags: ["demo-time"], revalidate: 60 } })
// Revalidate on demand
"use server"
import { revalidateTag } from "next/cache"
export async function action() {
  revalidateTag("demo-time") // or revalidatePath("/caching")
}

// Opt-out
await fetch(url, { cache: "no-store" })
await fetch(url, { next: { revalidate: 0 } })

// Next 16: use cache
"use cache"
export async function getData() {
  "use cache: private; revalidate: 30"
  return db.query()
}
`}
          />
          <Callout title="Interviewer expects">
            Default fetch is cached in RSC. Use <code>revalidate</code> (seconds) or <code>tags</code> +{" "}
            <code>revalidateTag</code> for on-demand. Mutations should revalidate affected tags/paths. Mention
            <code>cache: &quot;no-store&quot;</code> for per-request, and Next 16 <code>use cache</code> /{" "}
            <code>cacheLife</code> for fine-grained segment cache.
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don&apos;t call <code>revalidateTag</code> from client directly — use a Server Action. Don&apos;t cache
          user-specific data with a shared tag. For searchParams/cookies-dependent pages, they auto-opt into dynamic.
        </Callout>
      }
    />
  );
}
