import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Branded share image for any SEO page: section label, page title, and the StubParse mark. */
export function ogImage(section: string, title: string) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "72px 80px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 46, background: "#0b0b0c", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 7, background: "#ffe24a", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 32, fontWeight: 600, color: "#0b0b0c", letterSpacing: "-0.02em" }}>StubParse</span>
          <span style={{ fontSize: 28, color: "#6e6e73", marginLeft: 12 }}>{section}</span>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 48 ? 76 : 92, fontWeight: 700, color: "#0b0b0c", letterSpacing: "-0.045em", lineHeight: 1.02, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#6e6e73" }}>
          <span style={{ background: "#ffe24a", color: "#0b0b0c", padding: "4px 12px", borderRadius: 6 }}>Free</span>
          PDF or photo → Excel, CSV, JSON · Math checked
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
