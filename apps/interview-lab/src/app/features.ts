export type Feature = {
  href: string;
  title: string;
  tag: string;
  desc: string;
  question: string;
  accent: string;
};

export const features: Feature[] = [
  {
    href: "/rsc",
    title: "RSC vs Client",
    tag: "RSC",
    desc: "Server Components, client islands, composition boundaries.",
    question: "What is RSC? Why not useEffect for data?",
    accent: "bg-violet-600",
  },
  {
    href: "/streaming",
    title: "Streaming & Suspense",
    tag: "Streaming",
    desc: "loading.tsx, Suspense, non-blocking data.",
    question: "How to avoid waterfall without blocking?",
    accent: "bg-blue-600",
  },
  {
    href: "/caching",
    title: "Caching & Revalidation",
    tag: "Cache",
    desc: "fetch cache, tags, revalidateTag/Path, use cache.",
    question: "Explain Next cache layers & invalidation.",
    accent: "bg-emerald-600",
  },
  {
    href: "/server-actions",
    title: "Server Actions",
    tag: "Actions",
    desc: "Mutations without API routes, useActionState.",
    question: "When Server Action vs Route Handler?",
    accent: "bg-orange-600",
  },
  {
    href: "/parallel-intercepting",
    title: "Parallel & Intercepting",
    tag: "Routing",
    desc: "@slot, (.) intercepting modals, Instagram pattern.",
    question: "How to show modal without losing page?",
    accent: "bg-pink-600",
  },
  {
    href: "/route-handlers",
    title: "Route Handlers",
    tag: "API",
    desc: "route.ts, async cookies/headers/searchParams.",
    question: "Route Handler vs Server Action trade-offs?",
    accent: "bg-zinc-800",
  },
  {
    href: "/middleware",
    title: "Middleware",
    tag: "Edge",
    desc: "Edge middleware, matcher, auth redirect.",
    question: "Where does auth run? Edge vs Node?",
    accent: "bg-cyan-600",
  },
  {
    href: "/metadata",
    title: "Metadata & SEO",
    tag: "SEO",
    desc: "generateMetadata, sitemap, og-image.",
    question: "SEO in App Router?",
    accent: "bg-amber-600",
  },
  {
    href: "/performance",
    title: "Performance",
    tag: "Perf",
    desc: "Image priority, next/font, next/script, PPR.",
    question: "LCP / CLS optimization?",
    accent: "bg-indigo-600",
  },
  {
    href: "/view-transitions",
    title: "View Transitions",
    tag: "UX",
    desc: "Native view transitions, Link transitions.",
    question: "Page transitions without SPA hacks?",
    accent: "bg-teal-600",
  },
  {
    href: "/activity",
    title: "Activity (React 19)",
    tag: "Activity",
    desc: "Preserve state while hidden — keep-alive without remount.",
    question: "Activity vs conditional rendering vs hidden?",
    accent: "bg-rose-600",
  },
  {
    href: "/use-transition",
    title: "useTransition — Advanced",
    tag: "Concurrent",
    desc: "Urgent vs transition, heavy filters/tabs, async server actions + optimistic.",
    question: "When to mark an update as transition?",
    accent: "bg-amber-600",
  },
  {
    href: "/use",
    title: "React use() — Advanced",
    tag: "React 19",
    desc: "use(promise) + use(context) conditionally, parallel Suspense, no waterfall.",
    question: "How does use differ from hooks?",
    accent: "bg-fuchsia-600",
  },
  {
    href: "/clerk",
    title: "Clerk Enterprise Concepts",
    tag: "Clerk",
    desc: "SSO, SCIM, Audit, RBAC, orgs — what’s free vs paid, with live demos.",
    question: "What can you demo on Clerk Free tier?",
    accent: "bg-indigo-600",
  },
  {
    href: "/gcp",
    title: "GCP for Full-Stack",
    tag: "GCP",
    desc: "Cloud Run, GCS, Secrets/IAM, SQL vs Firestore — local-first.",
    question: "How to deploy Next + upload + secrets on GCP?",
    accent: "bg-sky-600",
  },
];
