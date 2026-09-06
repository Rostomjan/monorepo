import { Hono } from "hono";

export const helloRoutes = new Hono();

helloRoutes.get("/hello", (c) => {
  const name = c.req.query("name") ?? "world";
  return c.json({ message: `Hello, ${name}!` });
});
