import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StubParse — Free Paystub Parser & PDF Payroll Data Extractor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "28px" }}>
          {/* Receipt icon */}
          <div
            style={{
              width: 80,
              height: 80,
              background: "#4f46e5",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
            }}
          >
            🧾
          </div>
          <span style={{ fontSize: 60, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
            StubParse
          </span>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 30, color: "#94a3b8", margin: "0 0 12px", textAlign: "center" }}>
          Extract payroll data from any PDF or image
        </p>
        <p style={{ fontSize: 22, color: "#64748b", margin: 0, textAlign: "center" }}>
          Export to Excel · CSV · JSON — Free, private, no login required
        </p>

        {/* Badges */}
        <div style={{ display: "flex", gap: "16px", marginTop: "44px" }}>
          {["100% Free", "No Account", "Zero Tokens", "Private"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 100,
                padding: "10px 24px",
                color: "#cbd5e1",
                fontSize: 20,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
