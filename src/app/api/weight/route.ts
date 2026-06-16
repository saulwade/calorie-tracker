import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

/** GET /api/weight — historial de peso (más reciente primero). */
export async function GET() {
  const rows = await db
    .select()
    .from(schema.weights)
    .orderBy(desc(schema.weights.day));
  return NextResponse.json({ weights: rows });
}

/** POST /api/weight — registra/actualiza el peso de un día. body: { day, weightKg } */
export async function POST(req: NextRequest) {
  const { day, weightKg } = await req.json();
  if (!day || typeof weightKg !== "number") {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  // upsert por día (day es unique)
  await db
    .insert(schema.weights)
    .values({ day, weightKg, loggedAt: Date.now() })
    .onConflictDoUpdate({
      target: schema.weights.day,
      set: { weightKg, loggedAt: Date.now() },
    });

  const rows = await db
    .select()
    .from(schema.weights)
    .orderBy(desc(schema.weights.day));
  return NextResponse.json({ weights: rows });
}
