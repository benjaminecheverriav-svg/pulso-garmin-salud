import type { NextConfig } from "next";

const API = process.env.API_URL ?? "http://127.0.0.1:8765";

const nextConfig: NextConfig = {
  // Los tipos compartidos se importan como código TypeScript del monorepo.
  transpilePackages: ["@pulso/shared"],
  // La web llama a /api/* y Next lo reenvía a la API de NestJS (sin problemas de CORS).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
