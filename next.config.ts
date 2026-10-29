import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/catalog", destination: "/", permanent: true }];
  },
  serverExternalPackages: ["nodemailer", "sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "220mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
