import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthControls() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-md px-3 py-1.5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">Sign in</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <div className="ml-1 flex items-center gap-2 rounded-full border bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
          <UserButton />
        </div>
      </Show>
    </>
  );
}
