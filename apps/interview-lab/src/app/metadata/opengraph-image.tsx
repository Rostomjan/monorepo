import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 60,
          background: "#09090b",
          color: "white",
        }}
      >
        <div style={{ fontSize: 20, opacity: 0.6, letterSpacing: 4, textTransform: "uppercase" }}>
          Next.js Interview Lab
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 16, lineHeight: 1.1 }}>Metadata & OG Image</div>
        <div style={{ fontSize: 22, opacity: 0.7, marginTop: 16 }}>Dynamic via opengraph-image.tsx + ImageResponse</div>
      </div>
    ),
    size
  );
}
