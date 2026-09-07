import Link from "next/link";
import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";

export const metadata = { title: "Parallel & Intercepting" };

const photos = [
  { id: "1", color: "bg-indigo-500", title: "Indigo" },
  { id: "2", color: "bg-emerald-500", title: "Emerald" },
  { id: "3", color: "bg-rose-500", title: "Rose" },
];

export default function Page() {
  return (
    <DemoShell
      title="Parallel & Intercepting Routes"
      intro="Parallel @slots render side-by-side; intercepting (.) routes show a modal when navigating, but full page on refresh/direct link — Instagram pattern."
      demo={
        <>
          <DemoCard title="Gallery — click to intercept as modal">
            <div className="grid grid-cols-3 gap-3">
              {photos.map((p) => (
                <Link
                  key={p.id}
                  href={`/parallel-intercepting/photo/${p.id}`}
                  className={`flex h-28 items-center justify-center rounded-xl text-sm font-bold text-white ${p.color} hover:opacity-90`}
                >
                  {p.title}
                </Link>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Soft nav → modal via <code>@modal/(.)photo/[id]</code>. Hard refresh → full page at{" "}
              <code>/photo/[id]</code>.
            </p>
          </DemoCard>
          <DemoCard title="How it works">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <code>layout.tsx</code> renders <code>&#123;children&#125; + &#123;modal&#125;</code> (parallel slot).
              </li>
              <li>
                <code>@modal/(.)photo/[id]/page.tsx</code> intercepts navigation from same level.
              </li>
              <li>
                <code>photo/[id]/page.tsx</code> is the fallback full page.
              </li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// layout.tsx
export default function Layout({ children, modal }: { children, modal }) {
  return <>{children}{modal}</>
}

// @modal/(.)photo/[id]/page.tsx — modal
export default function PhotoModal({ params }: { params: { id: string } }) {
  return <Dialog><Photo id={params.id} /></Dialog>
}

// photo/[id]/page.tsx — full page fallback
export default function PhotoPage({ params }) {
  return <Photo id={params.id} />
}
`}
          />
          <Callout title="Interviewer expects">
            Parallel = <code>@slot</code> folders rendered simultaneously. Intercepting = <code>(.)</code>,{" "}
            <code>(..)</code>, <code>(...)</code> to hijack navigation for modal while preserving background route.
            Mention soft vs hard navigation difference.
          </Callout>
        </>
      }
      interview={
        <Callout title="Use case">
          Photo feed → detail modal, keep scroll position. Direct link / refresh still works (SEO-friendly).
        </Callout>
      }
    />
  );
}
