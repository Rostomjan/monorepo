import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { clearMemos, getMemos } from "./actions";
import { MemoForm } from "./Form";

export const metadata = { title: "Server Actions" };

export default async function Page() {
  const memos = await getMemos();

  return (
    <DemoShell
      title="Server Actions"
      intro="Mutations without a separate API route. Actions run on the server, revalidate cache, and work without JS (progressive enhancement)."
      demo={
        <>
          <DemoCard title="Create memo">
            <MemoForm />
          </DemoCard>
          <DemoCard title="Memos (in-memory, revalidated via revalidatePath)">
            <ul className="space-y-2">
              {memos.length === 0 ? (
                <li className="text-sm text-zinc-500">No memos yet.</li>
              ) : (
                memos.map((m) => (
                  <li key={m.id} className="rounded-md border px-3 py-2 text-sm dark:border-zinc-700">
                    {m.text}
                  </li>
                ))
              )}
            </ul>
            <form action={clearMemos} className="mt-3">
              <button className="text-xs text-zinc-500 underline hover:text-zinc-700">Clear all</button>
            </form>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// actions.ts
"use server"
import { revalidatePath } from "next/cache"
export async function createMemo(prev, formData: FormData) {
  const text = String(formData.get("text")||"").trim()
  if (!text) return { error: "Required" }
  await db.insert({ text })
  revalidatePath("/server-actions")
  return { ok: true }
}

// Form.tsx — client
"use client"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
export function MemoForm() {
  const [state, action] = useActionState(createMemo, null)
  return (
    <form action={action}>
      <input name="text" />
      <Submit />
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
function Submit() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? "Saving…" : "Add"}</button>
}
`}
          />
          <Callout title="Interviewer expects">
            Server Actions = async functions with <code>&quot;use server&quot;</code>, called from{" "}
            <code>&lt;form action=&#123;action&#125;&gt;</code>. They run server-side, can access DB, then{" "}
            <code>revalidatePath/Tag</code> or <code>redirect</code>. Client uses{" "}
            <code>useActionState</code> for errors and <code>useFormStatus</code> for pending. Prefer actions for
            mutations; Route Handlers for webhooks/external clients.
          </Callout>
        </>
      }
      interview={
        <Callout title="Gotchas">
          Validate on server even if client validates. Actions must be serializable args (FormData or JSON-serializable).
          Don&apos;t put secrets in client. After mutation, revalidate affected routes — otherwise stale cache.
        </Callout>
      }
    />
  );
}
