import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El SDK de Anthropic y libsql corren en el servidor (Node), no en el bundle del cliente.
  serverExternalPackages: ["@anthropic-ai/sdk", "@libsql/client"],
};

export default nextConfig;
