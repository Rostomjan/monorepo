import type { Id } from "@repo/backend/convex/_generated/dataModel";
import Link from "next/link";
import { ItemManager } from "../../../components/item-manager";

const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ItemPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8">
      <Link href="/" className="underline text-zinc-600 text-sm">
        Back to dashboard
      </Link>
      {hasBackend ? (
        <ItemManager subjectId={params.id as Id<"subjects">} />
      ) : (
        <p className="text-zinc-500 text-sm max-w-md text-center">
          No backend connected. Set NEXT_PUBLIC_CONVEX_URL and seed content to
          begin.
        </p>
      )}
    </main>
  );
}
