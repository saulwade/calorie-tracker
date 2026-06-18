import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { generateGuide } from "@/lib/anthropic";
import { getOrCreateProfile } from "@/lib/profile";
import { allow, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/guide  body: { foods?: string } — guía personalizada para comer limpio. */
export async function POST(req: NextRequest) {
  try {
    if (!allow("ai")) return tooMany();
    const body = await req.json().catch(() => ({}));
    const foods: string | undefined = body.foods;

    const p = await getOrCreateProfile();

    const recent = await db
      .select({ name: schema.meals.name })
      .from(schema.meals)
      .orderBy(desc(schema.meals.loggedAt))
      .limit(20);

    // Recomendaciones recientes del Coach IA (últimos análisis del día) para
    // que la guía refleje qué evitar / qué sumar.
    const coachRows = await db
      .select({
        avoidFoods: schema.dayCoaching.avoidFoods,
        addFoods: schema.dayCoaching.addFoods,
      })
      .from(schema.dayCoaching)
      .orderBy(desc(schema.dayCoaching.createdAt))
      .limit(7);

    const dedup = (key: "avoidFoods" | "addFoods") => {
      const set = new Set<string>();
      for (const r of coachRows) {
        try {
          for (const f of JSON.parse(r[key]) as string[]) {
            if (f && set.size < 6) set.add(f.toLowerCase());
          }
        } catch {
          /* ignora json inválido */
        }
      }
      return [...set];
    };

    const guide = await generateGuide({
      targets: {
        calories: p.targetCalories,
        protein: p.targetProtein,
        fiber: p.targetFiber,
        sugar: p.targetSugar,
        sodium: p.targetSodium,
      },
      recentFoods: recent.map((r) => r.name),
      pantry: foods,
      avoidFoods: dedup("avoidFoods"),
      addFoods: dedup("addFoods"),
    });

    return NextResponse.json({ guide });
  } catch (err) {
    console.error("Error en guide:", err instanceof Error ? err.message : err);
    const msg = err instanceof Error ? err.message : "Error al generar la guía.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
