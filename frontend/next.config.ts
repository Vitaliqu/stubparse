import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js", "jimp"],

  // COOP + COEP headers — required for SharedArrayBuffer (used by onnxruntime-web WASM)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",    value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "require-corp" },
          { key: "X-Frame-Options",               value: "DENY" },
          { key: "X-Content-Type-Options",        value: "nosniff" },
          { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",            value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  turbopack: {},

  webpack(config) {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
