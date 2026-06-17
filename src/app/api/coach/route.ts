import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { coachDay } from "@/lib/anthropic";
import { getOrCreateProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/coach?day=YYYY-MM-DD — evaluación del día por el "nutriólogo". */
export async function GET(req: NextRequest) {
  try {
    const day = req.nextUrl.searchParams.get("day");
    if (!day) return NextResponse.json({ error: "falta day" }, { status: 400 });

    const meals = await db
      .select()
      .from(schema.meals)
      .where(eq(schema.meals.day, day));

    if (meals.length === 0) {
      return NextResponse.json({
        empty: true,
        message: "Aún no registras comidas hoy. Registra algo y te evalúo el día.",
      });
    }

    const p = await getOrCreateProfile();
    const coaching = await coachDay({
      meals,
      targets: {
        calories: p.targetCalories,
        protein: p.targetProtein,
        carbs: p.targetCarbs,
        fat: p.targetFat,
        fiber: p.targetFiber,
        sugar: p.targetSugar,
        sodium: p.targetSodium,
      },
    });

    return NextResponse.json({ coaching });
  } catch (err) {
    console.error("Error en coach:", err);
    const msg = err instanceof Error ? err.message : "Error al evaluar el día.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
