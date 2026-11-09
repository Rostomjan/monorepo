// Flags Explorer discovery endpoint: lets the Vercel Toolbar discover this
// app's flag definitions and provide session-local overrides (Flags
// Explorer) at dev time. Requires FLAGS_SECRET (Vercel auto-creates it on
// the first flag created in the dashboard).
import { createFlagsDiscoveryEndpoint } from "flags/next";
import { getProviderData } from "@flags-sdk/vercel";
import * as flags from "@/lib/flags";

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return await getProviderData(flags);
});
