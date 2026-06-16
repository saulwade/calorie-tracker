import { NextRequest, NextResponse } from "next/server";

// Rutas que NO requieren contraseña.
const PUBLIC = ["/login", "/api/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permite estáticos y rutas públicas.
  if (
    PUBLIC.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD;
  const cookie = req.cookies.get("pct_auth")?.value;

  // Si no hay contraseña configurada, no bloqueamos (modo abierto).
  if (!expected) return NextResponse.next();

  if (cookie === expected) return NextResponse.next();

  // No autenticado: a /login (o 401 si es una llamada al API).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
