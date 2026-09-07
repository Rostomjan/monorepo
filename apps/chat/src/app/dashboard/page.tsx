"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@repo/ui";

export default function Dashboard() {
  const { data: session } = authClient.useSession();

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {session ? (
        <div>
          <p>Welcome, {session.user.name}!</p>
          <Button onClick={() => authClient.signOut()}>Sign Out</Button>
        </div>
      ) : (
        <div>
          <p>You are not signed in.</p>
          <Button
            onClick={() => authClient.signIn.social({ provider: "github" })}
          >
            Sign In with GitHub
          </Button>
        </div>
      )}
    </div>
  );
}
