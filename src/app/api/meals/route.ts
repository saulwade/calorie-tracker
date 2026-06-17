import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { analyzeFood } from "@/lib/anthropic";
import { getOrCreateProfile } from "@/lib/profile";
import { allow, tooMany } from "@/lib/ratelimit";

const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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

function goalContextFrom(p: {
  targetCalories: number;
  targetProtein: number;
  targetFiber: number;
  targetSugar: number;
  targetSodium: number;
}): string {
  return `Contexto del usuario: quiere bajar de peso de forma saludable. Sus metas diarias son ~${p.targetCalories} kcal, ${p.targetProtein}g proteína, ${p.targetFiber}g fibra, máx ${p.targetSugar}g azúcar y ${p.targetSodium}mg sodio. Califica y aconseja con eso en mente.`;
}

function microCols(m: import("@/lib/anthropic").MealMicros) {
  return {
    iron: m.iron,
    potassium: m.potassium,
    magnesium: m.magnesium,
    zinc: m.zinc,
    calcium: m.calcium,
    vitC: m.vitC,
    vitD: m.vitD,
    vitB12: m.vitB12,
    omega3: m.omega3,
  };
}

/**
 * POST /api/meals — analiza con Claude y guarda.
 * body: { text?, images?: [{base64, mediaType}], imageBase64?, mediaType?, source, day }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Registro rápido desde un favorito (sin IA) ---
    if (body.fromFavorite) {
      if (!body.day) {
        return NextResponse.json({ error: "falta day" }, { status: 400 });
      }
      const favRows = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, Number(body.fromFavorite)));
      const f = favRows[0];
      if (!f)
        return NextResponse.json(
          { error: "favorito no existe" },
          { status: 404 },
        );
      const inserted = await db
        .insert(schema.meals)
        .values({
          day: body.day,
          loggedAt: Date.now(),
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          fiber: f.fiber,
          sodium: f.sodium,
          sugar: f.sugar,
          vitamins: f.vitamins,
          iron: f.iron,
          potassium: f.potassium,
          magnesium: f.magnesium,
          zinc: f.zinc,
          calcium: f.calcium,
          vitC: f.vitC,
          vitD: f.vitD,
          vitB12: f.vitB12,
          omega3: f.omega3,
          items: f.items,
          source: "text",
          confidence: "alta",
          notes: "",
          score: f.score,
          tip: f.tip,
        })
        .returning();
      return NextResponse.json({ meal: inserted[0] });
    }

    const { text, images, imageBase64, mediaType, source = "text", day } = body;

    // Normaliza a un arreglo de imágenes (acepta varias o una sola por compatibilidad).
    const imgs: { base64: string; mediaType: string }[] = Array.isArray(images)
      ? images
      : imageBase64 && mediaType
        ? [{ base64: imageBase64, mediaType }]
        : [];

    if (!day) {
      return NextResponse.json({ error: "falta day" }, { status: 400 });
    }
    if (!text && imgs.length === 0) {
      return NextResponse.json(
        { error: "Escribe algo o sube una foto." },
        { status: 400 },
      );
    }

    // Protección de costo: tope de llamadas a la IA.
    if (!allow("ai")) return tooMany();

    // Validar imágenes (cantidad, tipo, tamaño) antes de mandarlas a la IA.
    if (imgs.length > 4) {
      return NextResponse.json({ error: "Máximo 4 fotos." }, { status: 400 });
    }
    for (const im of imgs) {
      if (!ALLOWED_MEDIA.includes(im.mediaType)) {
        return NextResponse.json(
          { error: "Formato de imagen no soportado." },
          { status: 400 },
        );
      }
      if (typeof im.base64 !== "string" || im.base64.length > 8_000_000) {
        return NextResponse.json(
          { error: "Imagen demasiado grande." },
          { status: 400 },
        );
      }
    }

    const profile = await getOrCreateProfile();
    const goalContext = goalContextFrom(profile);

    const analysis = await analyzeFood({ text, images: imgs, goalContext });

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
        ...microCols(analysis.micros),
        items: JSON.stringify(analysis.items),
        source,
        confidence: analysis.confidence,
        notes: analysis.notes,
        score: analysis.score,
        tip: analysis.tip,
      })
      .returning();

    return NextResponse.json({ meal: inserted[0] });
  } catch (err) {
    console.error("Error analizando comida:", err instanceof Error ? err.message : err);
    const msg =
      err instanceof Error ? err.message : "Error al analizar la comida.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/meals?id=123 — edita una comida.
 * body: { correction: "duplica la porción" }  -> recalcula con IA
 *   ó:  { manual: { name?, calories?, protein?, carbs?, fat?, fiber?, sugar?, sodium? } } -> edita a mano
 */
export async function PATCH(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });

    const rows = await db
      .select()
      .from(schema.meals)
      .where(eq(schema.meals.id, id));
    const meal = rows[0];
    if (!meal)
      return NextResponse.json({ error: "no existe" }, { status: 404 });

    const body = await req.json();

    // --- Edición a mano (sin IA) ---
    if (body.manual) {
      const m = body.manual;
      const updated = await db
        .update(schema.meals)
        .set({
          name: typeof m.name === "string" ? m.name : meal.name,
          calories: num(m.calories, meal.calories),
          protein: num(m.protein, meal.protein),
          carbs: num(m.carbs, meal.carbs),
          fat: num(m.fat, meal.fat),
          fiber: num(m.fiber, meal.fiber),
          sugar: num(m.sugar, meal.sugar),
          sodium: num(m.sodium, meal.sodium),
        })
        .where(eq(schema.meals.id, id))
        .returning();
      return NextResponse.json({ meal: updated[0] });
    }

    // --- Ajuste por chat (recalcula con IA) ---
    if (body.correction) {
      if (!allow("ai")) return tooMany();
      const profile = await getOrCreateProfile();
      const analysis = await analyzeFood({
        text: `Comida ya registrada: "${meal.name}" (actualmente ${Math.round(meal.calories)} kcal, P${Math.round(meal.protein)} C${Math.round(meal.carbs)} G${Math.round(meal.fat)}). El usuario pide este ajuste: "${body.correction}". Recalcula la comida COMPLETA aplicando ese ajuste.`,
        goalContext: goalContextFrom(profile),
      });
      const updated = await db
        .update(schema.meals)
        .set({
          name: analysis.name,
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fat: analysis.fat,
          fiber: analysis.fiber,
          sodium: analysis.sodium,
          sugar: analysis.sugar,
          vitamins: JSON.stringify(analysis.vitamins),
          ...microCols(analysis.micros),
          items: JSON.stringify(analysis.items),
          confidence: analysis.confidence,
          notes: analysis.notes,
          score: analysis.score,
          tip: analysis.tip,
        })
        .where(eq(schema.meals.id, id))
        .returning();
      return NextResponse.json({ meal: updated[0] });
    }

    return NextResponse.json({ error: "nada que editar" }, { status: 400 });
  } catch (err) {
    console.error("Error editando comida:", err instanceof Error ? err.message : err);
    const msg = err instanceof Error ? err.message : "Error al editar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** DELETE /api/meals?id=123 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  await db.delete(schema.meals).where(eq(schema.meals.id, Number(id)));
  return NextResponse.json({ ok: true });
}
