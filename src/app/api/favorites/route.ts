import { NextRequest, NextResponse } from "next/server";
import { db, schema, client } from "@/db";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      fiber REAL NOT NULL DEFAULT 0,
      sodium REAL NOT NULL DEFAULT 0,
      sugar REAL NOT NULL DEFAULT 0,
      vitamins TEXT NOT NULL DEFAULT '[]',
      score REAL NOT NULL DEFAULT 0,
      tip TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0
    );
  `);
  ensured = true;
}

/** GET /api/favorites — lista (más recientes primero). */
export async function GET() {
  await ensureTable();
  const rows = await db
    .select()
    .from(schema.favorites)
    .orderBy(desc(schema.favorites.createdAt));
  return NextResponse.json({ favorites: rows });
}

/** POST /api/favorites  body { mealId } — guarda una comida como favorita. */
export async function POST(req: NextRequest) {
  await ensureTable();
  const body = await req.json();

  if (!body.mealId) {
    return NextResponse.json({ error: "falta mealId" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(schema.meals)
    .where(eq(schema.meals.id, Number(body.mealId)));
  const m = rows[0];
  if (!m) return NextResponse.json({ error: "no existe" }, { status: 404 });

  const inserted = await db
    .insert(schema.favorites)
    .values({
      name: m.name,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
      sodium: m.sodium,
      sugar: m.sugar,
      vitamins: m.vitamins,
      score: m.score,
      tip: m.tip,
      createdAt: Date.now(),
    })
    .returning();
  return NextResponse.json({ favorite: inserted[0] });
}

/** DELETE /api/favorites?id=123 */
export async function DELETE(req: NextRequest) {
  await ensureTable();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  await db.delete(schema.favorites).where(eq(schema.favorites.id, Number(id)));
  return NextResponse.json({ ok: true });
}
