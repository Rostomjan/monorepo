# Stitch design system hookup

Stitch: https://stitch.withgoogle.com/

Workflow (KISS):

1. In Stitch, create a project "Ichiba Stage 1" and generate: product grid, product detail (PDP), cart drawer, orders list.
2. In Stitch, open Theme / Design tokens and copy: primary color, surface/text colors, corner radius, font family.
3. Paste tokens into `src/app/globals.css` inside `@theme` as `--color-*`, `--radius-*`, `--font-*`.
4. App code must only use semantic utilities (`bg-ichiba`, `text-ichiba`, `rounded-[var(--radius-card)]`). Never hard-code Stitch hex in components — keep it in `@theme` so a re-export is a one-file change.
5. If Stitch exports a component you like (e.g. ProductCard), port it into `packages/ui` as a presentational component (no app logic), then import it from `@repo/ui` in `apps/ichiba`.

Current baseline theme: `--color-ichiba: #bf0000` (Rakuten-crimson-inspired placeholder) — replace with your Stitch export when ready.
