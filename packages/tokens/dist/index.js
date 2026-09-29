"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  colors: () => colors,
  fonts: () => fonts,
  radius: () => radius,
  shadows: () => shadows,
  spacing: () => spacing
});
module.exports = __toCommonJS(index_exports);
var colors = {
  // Brand (crimson). Primary CTA, active pill, logo tile.
  primary: "#d92d20",
  brand: "#d92d20",
  brandDeep: "#b50c08",
  onBrand: "#fff6f5",
  // Ink / text.
  ink: "#0d1c2e",
  muted: "#565e74",
  nav: "#5c403b",
  dark: "#233144",
  onDark: "#eaf1ff",
  // Surfaces.
  white: "#ffffff",
  canvas: "#f8f9ff",
  strip: "#eff4ff",
  pill: "#e6eeff",
  filterActive: "#dce9ff",
  media: "#eff4ff",
  // Success / trust green.
  success: "#006646",
  successDot: "#00825a",
  mint: "#85f8c4",
  // Lines / misc.
  divider: "#e5bdb7",
  danger: "#ba1a1a",
  // Back-compat aliases for the pre-Figma palette.
  secondary: "#565e74",
  successLegacy: "#28a745",
  warning: "#ffc107",
  info: "#17a2b8",
  light: "#f8f9ff",
  black: "#000000"
};
var spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem"
};
var radius = {
  card: "0.75rem",
  // 12px — cards, cart groups, summary
  media: "0.5rem",
  // 8px — media, buttons, banners
  sm: "0.25rem",
  // 4px — inner icon tiles
  pill: "9999px"
};
var fonts = {
  // Plus Jakarta Sans (Google Font, loaded via next/font in layout).
  sans: '"Plus Jakarta Sans", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", ui-sans-serif, system-ui, sans-serif',
  // Kanji brand marks (市 / 和 / 壱) — system CJK fallback, no webfont needed.
  kanji: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "WenQuanYi Zen Hei", sans-serif'
};
var shadows = {
  card: "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.1)",
  pop: "0 4px 12px rgb(0 0 0 / 0.12), 0 2px 6px rgb(0 0 0 / 0.08)"
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  colors,
  fonts,
  radius,
  shadows,
  spacing
});
