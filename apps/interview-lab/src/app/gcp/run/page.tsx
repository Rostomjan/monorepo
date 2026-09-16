import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "Cloud Run" };

export default function Page() {
  return (
    <DemoShell
      title="Cloud Run — deploy Next.js"
      intro="Cloud Run runs your Dockerfile on demand (scale-to-zero). Interview core: standalone output, Artifact Registry vs source deploy, concurrency, min-instances, IAM invoker."
      demo={
        <>
          <DemoCard title="Dockerfile (local preview, Next standalone)">
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
{`FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start", "--", "-p", "3000"]`}
            </pre>
            <p className="mt-2 text-xs text-zinc-500">
              Real file lives at repo root for deploy. Uses <code>output: standalone</code> in real Next config for
              slim image.
            </p>
          </DemoCard>
          <DemoCard title="Deploy command builder (copy-ready)">
            <div className="space-y-1 font-mono text-xs">
              <div>gcloud run deploy interview-lab \</div>
              <div className="pl-4">--source . --region europe-west1 \</div>
              <div className="pl-4">--allow-unauthenticated \</div>
              <div className="pl-4">--concurrency 80 --min-instances 0 --max-instances 4</div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Local-first: no project needed to learn flags. Live needs <code>gcloud auth login</code> + project ID.
            </p>
          </DemoCard>
          <DemoCard title="Knobs interviewers probe">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <b>concurrency</b> — requests per container (Node: 80 default is fine).
              </li>
              <li>
                <b>min-instances 0</b> — scale-to-zero (cheap, cold start) vs <b>1</b> (no cold start, always billed).
              </li>
              <li>
                <b>CPU throttling</b> — disable for background / WebSocket-ish work.
              </li>
              <li>
                <b>IAM</b> — <code>--allow-unauthenticated</code> = public; otherwise require <code>run.invoker</code>.
              </li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="bash"
            code={`
# One-time: enable APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Deploy from source (Cloud Build builds it)
gcloud run deploy interview-lab \\
  --source . \\
  --region europe-west1 \\
  --allow-unauthenticated \\
  --set-env-vars NODE_ENV=production

# Or Docker-first
docker build -t europe-west1-docker.pkg.dev/PROJECT/apps/interview-lab:v1 .
docker push europe-west1-docker.pkg.dev/PROJECT/apps/interview-lab:v1
gcloud run deploy interview-lab \\
  --image europe-west1-docker.pkg.dev/PROJECT/apps/interview-lab:v1 \\
  --region europe-west1
`}
          />
          <CodeBlock
            lang="js"
            code={`
// next.config.mjs — slim image for Cloud Run
const nextConfig = {
  output: "standalone",
};
export default nextConfig;
`}
          />
          <Callout title="Interviewer expects">
            Cloud Run = serverless containers, scale-to-zero, pay-per-request. Next needs <code>standalone</code>{" "}
            output + <code>PORT</code> listen. Mention Artifact Registry for versioned images, Cloud Build for source
            deploys, and min-instances trade-off (cost vs cold start).
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don’t bake secrets into the image — use Secret Manager / <code>--set-secrets</code>. Don’t set min-instances
          1 “just in case” (billed 24/7). Don’t forget region (pick near users + near Cloud SQL).
        </Callout>
      }
    />
  );
}
