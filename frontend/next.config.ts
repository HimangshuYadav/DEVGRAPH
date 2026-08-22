import type { NextConfig } from "next";

function getNormalizedBackendUrl(): string {
  let url = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").trim();
  if (!url || url === "undefined") {
    url = "http://localhost:8000";
  }
  // Strip trailing slashes
  url = url.replace(/\/+$/, "");
  // Ensure protocol is present
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
    url = `https://${url}`;
  }
  return url;
}

const backendUrl = getNormalizedBackendUrl();

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;


