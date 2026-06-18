import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql, desc, gte, eq } from "drizzle-orm";
import { coachWeek, type WeekCoaching } from "@/lib/anthropic";
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

function parseSaved(row: typeof schema.weekCoaching.$inferSelect): WeekCoaching {
  const arr = (s: string): string[] => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  return {
    weekScore: row.weekScore,
    verdict: row.verdict,
    tendencia: row.tendencia,
    good: arr(row.good),
    improve: arr(row.improve),
  };
}

/**
 * GET /api/coach/week[?peek=1|&refresh=1] — resumen de los últimos 7 días.
 * Guarda el resultado (no re-cobra IA salvo que cambie la semana o refresh=1).
 */
export async function GET(req: NextRequest) {
  try {
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    const peek = req.nextUrl.searchParams.get("peek") === "1";

    const today = new Date();
    const weekEnding = localDayServer(today);
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

    // Firma: nº de días + calorías + sodio de la semana.
    const cal = Math.round(rows.reduce((a, r) => a + (r.calories || 0), 0));
    const na = Math.round(rows.reduce((a, r) => a + (r.sodium || 0), 0));
    const signature = `${rows.length}:${cal}:${na}`;

    const savedRows = await db
      .select()
      .from(schema.weekCoaching)
      .where(eq(schema.weekCoaching.weekEnding, weekEnding));
    const saved = savedRows[0];

    if (peek) {
      if (saved)
        return NextResponse.json({
          coaching: parseSaved(saved),
          cached: true,
          stale: saved.signature !== signature,
        });
      return NextResponse.json({ none: true });
    }

    if (!refresh && saved && saved.signature === signature) {
      return NextResponse.json({ coaching: parseSaved(saved), cached: true });
    }

    if (!allow("ai")) return tooMany();

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

    const vals = {
      weekEnding,
      weekScore: coaching.weekScore,
      verdict: coaching.verdict,
      tendencia: coaching.tendencia,
      good: JSON.stringify(coaching.good),
      improve: JSON.stringify(coaching.improve),
      signature,
      createdAt: Date.now(),
    };
    await db
      .insert(schema.weekCoaching)
      .values(vals)
      .onConflictDoUpdate({
        target: schema.weekCoaching.weekEnding,
        set: vals,
      });

    return NextResponse.json({ coaching, cached: false });
  } catch (err) {
    console.error("Error en coach/week:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Error al evaluar la semana." },
      { status: 500 },
    );
  }
}
