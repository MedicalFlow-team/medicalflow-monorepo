import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Saída standalone: imagem Docker de produção enxuta
  // (usada por apps/web/Dockerfile — docs/infra/DEPLOY.md)
  output: "standalone",
};

export default nextConfig;
