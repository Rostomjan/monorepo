import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { PromiseDemo } from "./PromiseDemo";
import { ContextDemo } from "./ContextDemo";
import { AdvancedCompositionDemo } from "./AdvancedCompositionDemo";

export const metadata = { title: "React use() — Advanced" };

export default function Page() {
  return (
    <DemoShell
      title="React `use` — Advanced (Promise & Context)"
      intro="React 19 `use` unwraps promises (suspends) and reads context — and unlike hooks, it can be called conditionally, inside loops, and after early returns. In Next.js, server creates the promise, client consumes it with `use(promise)` inside Suspense."
      demo={
        <>
          <DemoCard title="1) use(promise) — suspend, ErrorBoundary, conditional">
            <PromiseDemo />
          </DemoCard>

          <DemoCard title="2) use(context) — conditional (impossible with useContext)">
            <ContextDemo />
          </DemoCard>

          <DemoCard title="3) Advanced — parallel promises + useTransition (no waterfall, stale-while-pending)">
            <AdvancedCompositionDemo />
          </DemoCard>

          <DemoCard title="When to choose what">
            <ul className="space-y-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>
                <code>use(promise)</code> → client unwraps <em>already-created</em> promise (from server or cached). Wrap in <code>Suspense</code> + <code>ErrorBoundary</code>.
              </li>
              <li>
                <code>use(context)</code> → conditional context read (feature flags, theming, org context). <code>useContext</code> would violate Rules of Hooks.
              </li>
              <li>
                Never create the promise <em>inside</em> the component render without cache/memo — you’ll suspend forever on a new promise each render.
              </li>
              <li>
                Combine with <code>useTransition</code>: mark navigation that swaps promises as transition → stale UI stays interactive with <code>isPending</code>.
              </li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Promise — server creates, client consumes with use()
// app/use/page.tsx (server)
import { Suspense } from "react"
import { UserCard } from "./UserCard" // "use client" + use(promise)

async function fetchUser(id: string) {
  const r = await fetch(\`https://api.example.com/users/\${id}\`, { next: { tags: ["user"] } })
  return r.json()
}
export default function Page() {
  const promise = fetchUser("1") // ← NOT awaited, passed as promise
  return (
    <Suspense fallback={<Skeleton />}>
      <UserCard promise={promise} />
    </Suspense>
  )
}

// UserCard.tsx ("use client")
"use client"
import { use } from "react"
export function UserCard({ promise }: { promise: Promise<User> }) {
  const user = use(promise) // suspends until resolved, can be conditional
  if (!user) return null // even early return before use is allowed
  return <div>{user.name}</div>
}

// + ErrorBoundary required — Suspense doesn't catch rejections
`}
          />
          <CodeBlock
            lang="tsx"
            code={`
// Context — conditional read (impossible with useContext)
"use client"
import { createContext, use } from "react"
const ThemeContext = createContext({ bg: "#fff" })

function Box({ enabled }: { enabled: boolean }) {
  if (!enabled) return <div>no theme</div>
  const theme = use(ThemeContext) // ✓ allowed conditionally
  // const theme = useContext(ThemeContext) // ❌ would violate Rules of Hooks if inside if
  return <div style={{ background: theme.bg }} />
}
`}
          />
          <CodeBlock
            lang="tsx"
            code={`
// Advanced — parallel promises + transition (no waterfall)
// "use client"
import { use, Suspense, useMemo, useTransition } from "react"

const cache = new Map()
function getPosts(id: string) {
  if (!cache.has(id)) cache.set(id, fetch(\`/api/posts?user=\${id}\`).then(r=>r.json()))
  return cache.get(id)
}

export function Dashboard({ userId }: { userId: string }) {
  const [id, setId] = useState(userId)
  const [isPending, startTransition] = useTransition()
  const postsPromise = useMemo(() => getPosts(id), [id])
  const userPromise = useMemo(() => getUser(id), [id])

  return (
    <>
      <button onClick={() => startTransition(() => setId("2"))}>Switch</button>
      {isPending && <span>Updating…</span>}
      <Suspense fallback={<Skeleton />}><Posts promise={postsPromise} /></Suspense>
      <Suspense fallback={<Skeleton />}><User promise={userPromise} /></Suspense>
    </>
  )
}
function Posts({ promise }: { promise: Promise<Post[]> }) {
  const posts = use(promise) // parallel, independent boundaries
  return posts.map(p => <div key={p.id}>{p.title}</div>)
}
`}
          />
          <Callout title="Interviewer expects (advanced)">
            <code>use</code> is not a hook — it can be called conditionally, inside <code>if</code>/loops, and after early returns. For promises, always memoize/cache by key and wrap in <code>Suspense</code> + <code>ErrorBoundary</code>. For context, prefer <code>use(context)</code> when the read is conditional (feature flag). Mention Next.js pattern: server <em>creates</em> promise, client <em>consumes</em> with <code>use</code> — avoids waterfall and keeps streaming.
          </Callout>
        </>
      }
      interview={
        <Callout title="Gotchas & follow-ups">
          <ul className="space-y-1">
            <li>Don’t <code>await</code> the promise in the server if you want streaming — pass the promise itself.</li>
            <li>New promise per render = infinite suspend — use <code>Map</code>/<code>useMemo</code> keyed cache.</li>
            <li>
              <code>use(promise)</code> suspends the nearest <code>Suspense</code>; split boundaries for parallel loading, single boundary for waterfall-like loading.
            </li>
            <li>
              vs <code>useEffect</code> fetch: <code>use</code> integrates with Suspense/transitions, no loading state, no effect waterfall, works with <code>useTransition</code> stale UI.
            </li>
            <li>
              Activity keeps mounted state; <code>use</code> + <code>Suspense</code> suspends until data arrives — complementary concurrent primitives.
            </li>
          </ul>
        </Callout>
      }
    />
  );
}
