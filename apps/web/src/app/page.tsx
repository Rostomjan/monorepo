"use client";

import { Button } from "@repo/ui";

export default function Page() {
  return (
    <div
      style={{ padding: "50px", textAlign: "center", fontFamily: "sans-serif" }}
    >
      <h1>Monorepo Web App</h1>
      <p>This app is powered by Next.js and Bun!</p>
      <Button onClick={() => alert("Button from shared UI!")}>
        Shared UI Button
      </Button>
    </div>
  );
}
