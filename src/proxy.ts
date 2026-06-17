import { NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "@/lib/auth";

// Rutas que NO requieren contraseña.
const PUBLIC = [
  "/login",
  "/api/login",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permite estáticos y rutas públicas.
  if (
    PUBLIC.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD;

  // Sin contraseña configurada:
  // - en producción: FAIL-CLOSED (nunca dejar la app abierta por accidente).
  // - en desarrollo: modo abierto (cómodo en local).
  if (!expected || expected === "cambiame") {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "App sin contraseña configurada (APP_PASSWORD)." },
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  const cookie = req.cookies.get("pct_auth")?.value;
  const expectedHash = await sha256Hex(expected);
  if (cookie === expectedHash) return NextResponse.next();

  // No autenticado: 401 al API, redirige a /login en páginas.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
