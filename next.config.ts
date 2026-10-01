import type { NextConfig } from "next";

// Site 100% estático (pasta `out/`), publicado pela Vercel em https://news.nico.dev.br
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
