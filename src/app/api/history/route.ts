import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { sql, desc } from "drizzle-orm";

export const runtime = "nodejs";

/** GET /api/history?limit=30 — totales por día (más reciente primero). */
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 30);

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
    .groupBy(schema.meals.day)
    .orderBy(desc(schema.meals.day))
    .limit(limit);

  return NextResponse.json({ days: rows });
}
