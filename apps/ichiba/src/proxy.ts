import { clerkMiddleware } from "@clerk/nextjs/server";

// Stage 2: identity is available app-wide, but every route stays public.
// Guests keep the Stage-1 mocked-guest behavior (owner "guest").
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};
