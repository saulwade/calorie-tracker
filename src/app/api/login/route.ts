import { NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSWORD no está configurada en el servidor." },
      { status: 500 },
    );
  }
  if (password !== expected) {
    return NextResponse.json(
      { error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  // Guardamos el HASH de la contraseña, no la contraseña en texto.
  res.cookies.set("pct_auth", await sha256Hex(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 año
    path: "/",
  });
  return res;
}
