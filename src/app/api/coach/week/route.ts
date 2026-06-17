import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql, desc, gte } from "drizzle-orm";
import { coachWeek } from "@/lib/anthropic";
import { getOrCreateProfile } from "@/lib/profile";
import { allow, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

function localDayServer(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** GET /api/coach/week — evaluación de los últimos 7 días por el nutriólogo. */
export async function GET() {
  try {
    if (!allow("ai")) return tooMany();
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const fromDay = localDayServer(from);

    const rows = await db
      .select({
        day: schema.meals.day,
        calories: sql<number>`sum(${schema.meals.calories})`,
        protein: sql<number>`sum(${schema.meals.protein})`,
        carbs: sql<number>`sum(${schema.meals.carbs})`,
        fat: sql<number>`sum(${schema.meals.fat})`,
        fiber: sql<number>`sum(${schema.meals.fiber})`,
        sodium: sql<number>`sum(${schema.meals.sodium})`,
        sugar: sql<number>`sum(${schema.meals.sugar})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.meals)
      .where(gte(schema.meals.day, fromDay))
      .groupBy(schema.meals.day)
      .orderBy(desc(schema.meals.day));

    if (rows.length === 0) {
      return NextResponse.json({
        empty: true,
        message:
          "Aún no hay comidas esta semana. Registra unos días y te hago el resumen.",
      });
    }

    const weights = await db
      .select({ day: schema.weights.day, weightKg: schema.weights.weightKg })
      .from(schema.weights)
      .where(gte(schema.weights.day, fromDay))
      .orderBy(desc(schema.weights.day));

    const p = await getOrCreateProfile();
    const coaching = await coachWeek({
      days: rows,
      weights,
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
    console.error("Error en coach/week:", err instanceof Error ? err.message : err);
    const msg =
      err instanceof Error ? err.message : "Error al evaluar la semana.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
