#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const TEMPLATES = join(ROOT, "templates");

const [, , kindArg, nameArg] = process.argv;

const KINDS = ["web", "api", "mobile", "package"] as const;
type Kind = (typeof KINDS)[number];

function usage(): never {
  console.error("Usage: bun run new <web|api|mobile|package> <name>");
  console.error("  web     -> apps/<name> (Next + @repo/ui)");
  console.error("  api     -> apps/<name> (Hono + Bun)");
  console.error("  mobile  -> apps/<name> (Expo + @repo/tokens)");
  console.error("  package -> packages/<name> (@repo/<name> tsup lib)");
  process.exit(1);
}

if (!kindArg || !nameArg || !(KINDS as readonly string[]).includes(kindArg)) usage();
const kind = kindArg as Kind;
const name = nameArg.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

const destDir = kind === "package" ? join(ROOT, "packages", name) : join(ROOT, "apps", name);
if (existsSync(destDir)) {
  console.error(`Target already exists: ${destDir}`);
  process.exit(1);
}

const templateDir = join(TEMPLATES, kind);
const scope = kind === "package" ? "@repo/" : "";

function copyTemplate(src: string, dest: string) {
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(join(dest, entry.name), { recursive: true });
      copyTemplate(srcPath, join(dest, entry.name));
      continue;
    }
    let outName = entry.name;
    const destSub = dest === destDir ? mapRootFile(kind, outName) : outName;
    const raw = readFileSync(srcPath, "utf8");
    const replaced = raw.replaceAll("__NAME__", name).replaceAll("__SCOPE__", scope);
    const outPath = join(dest, destSub);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, replaced);
  }
}

function mapRootFile(kind: Kind, file: string): string {
  if (kind === "web") {
    if (file === "app-layout.tsx") return join("src", "app", "layout.tsx");
    if (file === "app-page.tsx") return join("src", "app", "page.tsx");
    if (file === "app-globals.css") return join("src", "app", "globals.css");
  }
  if (kind === "api" && file === "src-index.ts") return join("src", "index.ts");
  if (kind === "api" && file === "src-index.test.ts") return join("src", "index.test.ts");
  if (kind === "package" && file === "src-index.ts") return join("src", "index.ts");
  return file;
}

mkdirSync(destDir, { recursive: true });
copyTemplate(templateDir, destDir);

// Ensure src dirs referenced by mapped files exist
if (kind === "web") mkdirSync(join(destDir, "src", "app"), { recursive: true });

console.log(`Created ${kind} "${name}" at ${destDir}`);
console.log("Next: bun install && bun run dev --filter " + name);
