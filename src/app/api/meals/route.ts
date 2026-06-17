import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { analyzeFood } from "@/lib/anthropic";
import { getOrCreateProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/meals?day=YYYY-MM-DD — comidas de un día. */
export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day");
  if (!day) return NextResponse.json({ error: "falta day" }, { status: 400 });

  const rows = await db
    .select()
    .from(schema.meals)
    .where(eq(schema.meals.day, day))
    .orderBy(desc(schema.meals.loggedAt));

  return NextResponse.json({ meals: rows });
}

/**
 * POST /api/meals — analiza con Claude y guarda.
 * body: { text?, imageBase64?, mediaType?, source, day }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, imageBase64, mediaType, source = "text", day } = body;

    if (!day) {
      return NextResponse.json({ error: "falta day" }, { status: 400 });
    }
    if (!text && !imageBase64) {
      return NextResponse.json(
        { error: "Escribe algo o sube una foto." },
        { status: 400 },
      );
    }

    const profile = await getOrCreateProfile();
    const goalContext = `Contexto del usuario: quiere bajar de peso de forma saludable. Sus metas diarias son ~${profile.targetCalories} kcal, ${profile.targetProtein}g proteína, ${profile.targetFiber}g fibra, máx ${profile.targetSugar}g azúcar y ${profile.targetSodium}mg sodio. Califica y aconseja con eso en mente.`;

    const analysis = await analyzeFood({
      text,
      imageBase64,
      mediaType,
      goalContext,
    });

    const now = Date.now();
    const inserted = await db
      .insert(schema.meals)
      .values({
        day,
        loggedAt: now,
        name: analysis.name,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        fiber: analysis.fiber,
        sodium: analysis.sodium,
        sugar: analysis.sugar,
        vitamins: JSON.stringify(analysis.vitamins),
        source,
        confidence: analysis.confidence,
        notes: analysis.notes,
        score: analysis.score,
        tip: analysis.tip,
      })
      .returning();

    return NextResponse.json({ meal: inserted[0] });
  } catch (err) {
    console.error("Error analizando comida:", err);
    const msg =
      err instanceof Error ? err.message : "Error al analizar la comida.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/meals?id=123 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  await db.delete(schema.meals).where(eq(schema.meals.id, Number(id)));
  return NextResponse.json({ ok: true });
}
