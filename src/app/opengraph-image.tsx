import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StubParse — Paystubs in. Spreadsheets out.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "72px 80px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 46, background: "#0b0b0c", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 7, background: "#ffe24a", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 34, fontWeight: 600, color: "#0b0b0c", letterSpacing: "-0.02em" }}>StubParse</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 104, fontWeight: 700, color: "#0b0b0c", letterSpacing: "-0.045em", lineHeight: 1 }}>Paystubs in.</span>
          <span style={{ fontSize: 104, fontWeight: 700, color: "#0b0b0c", letterSpacing: "-0.045em", lineHeight: 1, marginTop: 8, display: "flex" }}>
            <span style={{ background: "#ffe24a", padding: "0 12px", marginLeft: -12 }}>Spreadsheets out.</span>
          </span>
        </div>
        <span style={{ fontSize: 28, color: "#6e6e73" }}>PDF or photo → Excel, CSV, JSON · Math checked · 3 free</span>
      </div>
    ),
    size,
  );
}
