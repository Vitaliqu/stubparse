import { ImageResponse } from "next/og";

// Raster logo for schema.org Organization.logo (Google ignores SVG logos; needs ≥112×112).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <svg width="440" height="440" viewBox="0 0 24 24">
          <path d="M5 2.5H19Q20.5 2.5 20.5 4V20.2L18.375 19L16.25 20.2L14.125 19L12 20.2L9.875 19L7.75 20.2L5.625 19L3.5 20.2V4Q3.5 2.5 5 2.5Z" fill="#0b0b0c" />
          <rect x="6.5" y="9.5" width="11" height="3" rx="0.6" fill="#ffe24a" />
          <rect x="6.5" y="6" width="6" height="1.5" rx="0.6" fill="#fff" fillOpacity="0.55" />
          <rect x="6.5" y="14.5" width="8" height="1.5" rx="0.6" fill="#fff" fillOpacity="0.55" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
