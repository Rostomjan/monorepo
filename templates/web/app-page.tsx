import { Button } from "@repo/ui";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">__NAME__</h1>
      <p className="text-zinc-600 max-w-md text-center">
        New microfrontend. Deploy independently, share the design system.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
