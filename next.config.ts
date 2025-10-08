import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  images: {
    domains: ["lh3.googleusercontent.com","graph.facebook.com"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  env: {
    API_BASE_URL: "https://keyone-admin-main-production.up.railway.app/api/v1"
  },
};

export default nextConfig;
