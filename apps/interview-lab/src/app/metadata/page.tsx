import type { Metadata } from "next";
import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}): Promise<Metadata> {
  const { title } = await searchParams;
  return {
    title: title ? `${title} — Metadata demo` : "Metadata & SEO",
    description: "Demo of generateMetadata, sitemap and opengraph-image in App Router.",
    openGraph: {
      title: title ? `${title} — OG` : "Interview Lab — Metadata",
      description: "Dynamic metadata demo",
    },
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  const { title } = await searchParams;

  return (
    <DemoShell
      title="Metadata & SEO"
      intro="generateMetadata, sitemap.ts, robots.ts, opengraph-image.tsx — SEO without <Head> hacks. Metadata can be async and per-segment."
      demo={
        <>
          <DemoCard title="Dynamic title">
            <p className="text-sm">
              Current metadata title: <b>{title ? `${title} — Metadata demo` : "Metadata & SEO"}</b>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Try <a href="/metadata?title=Hello" className="underline">?title=Hello</a> then view page source / tab
              title.
            </p>
            <div className="mt-3 rounded bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
              Open graph image: <a href="/metadata/opengraph-image" className="underline">/metadata/opengraph-image</a>{" "}
              (generated via opengraph-image.tsx)
            </div>
          </DemoCard>
          <DemoCard title="Sitemap & robots">
            <p className="text-sm">
              Visit <a href="/sitemap.xml" className="underline">/sitemap.xml</a> and{" "}
              <a href="/robots.txt" className="underline">/robots.txt</a> — generated from <code>sitemap.ts</code> /
              <code>robots.ts</code>.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// app/metadata/page.tsx
export async function generateMetadata({ searchParams }: { searchParams: Promise<{title?:string}> }): Promise<Metadata> {
  const { title } = await searchParams
  return { title: title ? \`\${title} — demo\` : "Metadata & SEO" }
}

// app/sitemap.ts
export default function sitemap() {
  return [{ url: "https://example.com/metadata", lastModified: new Date() }]
}

// app/metadata/opengraph-image.tsx
import { ImageResponse } from "next/og"
export default function OgImage() {
  return new ImageResponse(<div style={{ fontSize: 48 }}>Interview Lab</div>)
}
`}
          />
          <Callout title="Interviewer expects">
            <code>generateMetadata</code> can be async, reads params/searchParams (now Promise in Next 15). No need for{" "}
            <code>next/head</code>. <code>sitemap.ts</code>/<code>robots.ts</code>/<code>opengraph-image.tsx</code> are
            file conventions. Mention <code>metadataBase</code> for absolute OG URLs.
          </Callout>
        </>
      }
      interview={
        <Callout title="Bonus">
          For dynamic OG images use <code>ImageResponse</code> (Edge). For static pages, metadata is extracted at build.
        </Callout>
      }
    />
  );
}
