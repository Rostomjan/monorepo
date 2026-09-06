import { Button } from "@repo/ui";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Docs site</h1>
      <p className="text-zinc-600 max-w-md text-center">
        Independent deployable website sharing the design system. Copy this app to bootstrap new
        microfrontends.
      </p>
      <Button>Shared button works here</Button>
    </main>
  );
}
