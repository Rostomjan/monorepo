import Link from "next/link";
import { ReviewRunner } from "../../components/review-runner";

const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ReviewPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Reviews</h1>
      {hasBackend ? (
        <ReviewRunner />
      ) : (
        <div className="text-center space-y-2">
          <p className="text-zinc-500 text-sm max-w-md">
            No backend connected. Set NEXT_PUBLIC_CONVEX_URL and seed content
            to begin.
          </p>
          <Link href="/" className="underline text-zinc-600 text-sm">
            Back to dashboard
          </Link>
        </div>
      )}
    </main>
  );
}
