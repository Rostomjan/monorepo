import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import Link from "next/link";

export const metadata = { title: "SSO (SAML / OIDC)" };

export default function Page() {
  return (
    <DemoShell
      title="SSO — SAML vs OpenID Connect"
      intro="SSO = one IdP login for many apps. OIDC (OAuth2 + JWT, social Google/GitHub) vs SAML (XML assertions, enterprise IdPs like Okta/Azure AD). Clerk free: social OIDC works, enterprise SAML/OIDC connections require paid plan."
      demo={
        <>
          <DemoCard title="✅ Free — Social OIDC (works now)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dashboard → <b>SSO connections → Add connection</b> → enable <b>Google</b> / <b>GitHub</b>. Those are OIDC under
              the hood and work on Free (10k MAU). Test: sign-out → <Link href="/sign-in" className="underline">/sign-in</Link> → you’ll see Google/GitHub buttons if enabled.
            </p>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Google OIDC ✓ Free</span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">GitHub OIDC ✓ Free</span>
            </div>
          </DemoCard>

          <DemoCard title="❌ Paid — SAML / Enterprise OIDC">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dashboard → <b>Enterprise → SSO connections → New → SAML</b> (Okta, Azure AD, OneLogin). Shows “Upgrade to <b>Pro/Enterprise</b>” on Free. You can’t create an IdP connection without billing. Interview point: SAML = XML Assertion → ACS URL → Clerk creates <code>enterpriseSSO</code> ticket.
            </p>
            <div className="mt-2 rounded bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-300">
              Free tier error you’ll see: “SAML enterprise connections are not available on the Free plan. Upgrade to Pro.” + <a href="https://dashboard.clerk.com" target="_blank" className="underline">dashboard.clerk.com</a> banner.
            </div>
          </DemoCard>

          <DemoCard title="How to explain SAML flow (whiteboard)">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>User → your app → redirect to IdP (SAMLRequest)</li>
              <li>IdP authenticates → POST SAMLResponse (Assertion) to Clerk ACS URL</li>
              <li>Clerk validates → creates session → sets <code>__session</code> cookie → redirects to <code>signInFallbackRedirectUrl</code></li>
              <li>Next: <code>clerkMiddleware</code> validates session, <code>auth().orgId</code> contains slug</li>
            </ol>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Clerk handles OIDC discovery & JWKS; you just enable social.
// Enterprise SAML — dashboard config (requires Pro/Enterprise)
// 1. Dashboard: Enterprise → SSO connections → + New → SAML
//    - IdP Entity ID, SSO URL, Certificate (from Okta/Azure)
//    - Domain: acme.com (email domain auto-routes)
// 2. Code: use Enterprise SSO button

import { SignIn } from "@clerk/nextjs"
// Shows enterprise button automatically when domain matches
<SignIn appearance={{ elements: { enterprise: "block" } }} />

// Programmatic SAML ticket (backend, after domain verified)
import { clerkClient } from "@clerk/nextjs/server"
const client = await clerkClient()
await client.samlConnections.createSamlConnection({
  name: "Okta - Acme",
  idpEntityId: "http://www.okta.com/exk...",
  idpSsoUrl: "https://acme.okta.com/app/.../sso/saml",
  idpCertificate: "MIIC...",
  attributeMapping: { email: "email", firstName: "givenName" },
})

// Middleware — enterprise slug routes still via clerkMiddleware
export default clerkMiddleware(async (auth, req) => {
  const { orgSlug } = await auth()
  if (req.nextUrl.pathname.startsWith("/acme") && !orgSlug) {
    return (await auth()).redirectToSignIn()
  }
})
`}
          />
          <Callout title="Interviewer expects (free-tier nuance)">
            “Social OIDC is free — that’s Google/GitHub in Clerk. SAML and enterprise OIDC (Okta, Azure AD, Auth0 as IdP) are <b>paid</b>. On Free I’d demo social, then point to dashboard’s ‘Upgrade to create SAML’ and sketch the SAML XML flow. The code doesn’t change — Clerk middleware handles both.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Gotchas / Pricing">
          Free = unlimited social SSO. Enterprise SSO starts at Pro (~$25/mo + $99 for SSO add-on — check pricing). OIDC enterprise = same gate as SAML. Always mention ACS URL whitelisting and domain verification as interview follow-up.
        </Callout>
      }
    />
  );
}
