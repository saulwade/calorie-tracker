import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El SDK de Anthropic y libsql corren en el servidor (Node), no en el bundle del cliente.
  serverExternalPackages: ["@anthropic-ai/sdk", "@libsql/client"],

  // Cabeceras de seguridad para la app pública (Vercel).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
