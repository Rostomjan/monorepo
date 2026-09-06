import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthRoutes } from "./routes/health";
import { helloRoutes } from "./routes/hello";

export const app = new Hono();

app.use("/*", cors());

app.route("/healthz", healthRoutes);
app.route("/api", helloRoutes);

app.get("/", (c) => c.json({ name: "api", status: "ok" }));

const port = Number(process.env.PORT ?? 3001);

export default {
  port,
  fetch: app.fetch,
};
