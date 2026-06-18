import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { coachDay, type DayCoaching } from "@/lib/anthropic";
import { getOrCreateProfile } from "@/lib/profile";
import { allow, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MICRO_KEYS = [
  "iron",
  "potassium",
  "magnesium",
  "zinc",
  "calcium",
  "vitC",
  "vitD",
  "vitB12",
  "omega3",
] as const;

/** Firma del estado de las comidas, para saber si el análisis guardado quedó viejo. */
function signatureOf(meals: { calories: number; sodium: number }[]): string {
  const cal = Math.round(meals.reduce((a, m) => a + (m.calories || 0), 0));
  const na = Math.round(meals.reduce((a, m) => a + (m.sodium || 0), 0));
  return `${meals.length}:${cal}:${na}`;
}

function parseSaved(row: typeof schema.dayCoaching.$inferSelect): DayCoaching {
  const arr = (s: string): string[] => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  return {
    dayScore: row.dayScore,
    verdict: row.verdict,
    good: arr(row.good),
    improve: arr(row.improve),
    avoidFoods: arr(row.avoidFoods),
    addFoods: arr(row.addFoods),
  };
}

/**
 * GET /api/coach?day=YYYY-MM-DD[&refresh=1] — evaluación del día por el Coach IA.
 * Devuelve la guardada si sigue vigente (no re-cobra la IA); regenera si las
 * comidas cambiaron o si refresh=1.
 */
export async function GET(req: NextRequest) {
  try {
    const day = req.nextUrl.searchParams.get("day");
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    // peek = solo mirar lo guardado, sin generar (no gasta IA).
    const peek = req.nextUrl.searchParams.get("peek") === "1";
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

    const signature = signatureOf(meals);

    // ¿Hay análisis guardado y vigente? Devuélvelo sin gastar IA.
    const savedRows = await db
      .select()
      .from(schema.dayCoaching)
      .where(eq(schema.dayCoaching.day, day));
    const saved = savedRows[0];

    // Modo peek: solo devolver lo guardado (sin generar ni gastar IA).
    if (peek) {
      if (saved)
        return NextResponse.json({
          coaching: parseSaved(saved),
          cached: true,
          stale: saved.signature !== signature,
          savedAt: saved.createdAt,
        });
      return NextResponse.json({ none: true });
    }

    if (!refresh && saved && saved.signature === signature) {
      return NextResponse.json({
        coaching: parseSaved(saved),
        cached: true,
        savedAt: saved.createdAt,
      });
    }

    // Hay que (re)generar: protege el costo de IA.
    if (!allow("ai")) return tooMany();

    const p = await getOrCreateProfile();
    const micros = Object.fromEntries(
      MICRO_KEYS.map((k) => [
        k,
        meals.reduce((a, m) => a + (Number(m[k]) || 0), 0),
      ]),
    );

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
      micros,
    });

    // Guarda (upsert por día) para no perderlo ni re-cobrar.
    await db
      .insert(schema.dayCoaching)
      .values({
        day,
        dayScore: coaching.dayScore,
        verdict: coaching.verdict,
        good: JSON.stringify(coaching.good),
        improve: JSON.stringify(coaching.improve),
        avoidFoods: JSON.stringify(coaching.avoidFoods),
        addFoods: JSON.stringify(coaching.addFoods),
        signature,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.dayCoaching.day,
        set: {
          dayScore: coaching.dayScore,
          verdict: coaching.verdict,
          good: JSON.stringify(coaching.good),
          improve: JSON.stringify(coaching.improve),
          avoidFoods: JSON.stringify(coaching.avoidFoods),
          addFoods: JSON.stringify(coaching.addFoods),
          signature,
          createdAt: Date.now(),
        },
      });

    return NextResponse.json({ coaching, cached: false });
  } catch (err) {
    console.error("Error en coach:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "No se pudo evaluar el día." },
      { status: 500 },
    );
  }
}
