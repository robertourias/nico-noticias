import type { NextConfig } from "next";

// Site 100% estático (pasta `out/`), publicável na Vercel, Netlify ou GitHub Pages.
// No GitHub Pages o site fica em /<repositório>; o workflow define PAGES_BASE_PATH.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
