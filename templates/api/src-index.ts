import { Hono } from "hono";
import { cors } from "hono/cors";

export const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => c.json({ name: "__NAME__", status: "ok" }));
app.get("/healthz", (c) => c.json({ status: "ok", uptime: process.uptime() }));
app.get("/api/hello", (c) => {
  const name = c.req.query("name") ?? "world";
  return c.json({ message: `Hello, ${name}!` });
});

const port = Number(process.env.PORT ?? 3001);

export default {
  port,
  fetch: app.fetch,
};
