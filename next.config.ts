import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Presentation compilation happens inside the Node.js MCP route. Keep the
  // platform-specific esbuild binary outside the Turbopack server bundle.
  serverExternalPackages: ["esbuild"],
};

export default nextConfig;
