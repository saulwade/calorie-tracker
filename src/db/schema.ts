import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

/**
 * Perfil del usuario (una sola fila, id = 1).
 * Guarda los datos para calcular metas y las metas diarias ya calculadas/editadas.
 */
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),

  // Datos para calcular la meta calórica (Mifflin-St Jeor)
  sex: text("sex", { enum: ["male", "female"] }).notNull().default("male"),
  age: integer("age").notNull().default(30),
  heightCm: real("height_cm").notNull().default(175),
  startWeightKg: real("start_weight_kg").notNull().default(87),
  goalWeightKg: real("goal_weight_kg").notNull().default(75),
  activity: text("activity", {
    enum: ["sedentary", "light", "moderate", "active", "very_active"],
  })
    .notNull()
    .default("light"),
  // Déficit calórico diario (kcal) para bajar de peso. 500 ≈ medio kilo/semana.
  deficit: integer("deficit").notNull().default(500),

  // Metas diarias (calculadas, pero editables a mano)
  targetCalories: integer("target_calories").notNull().default(1900),
  targetProtein: integer("target_protein").notNull().default(150),
  targetCarbs: integer("target_carbs").notNull().default(170),
  targetFat: integer("target_fat").notNull().default(60),
  targetFiber: integer("target_fiber").notNull().default(30),
  targetSodium: integer("target_sodium").notNull().default(2300),
  targetSugar: integer("target_sugar").notNull().default(40),

  updatedAt: integer("updated_at").notNull().default(0),
});

/**
 * Cada comida/registro de alimento.
 */
export const meals = sqliteTable("meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Día local en formato YYYY-MM-DD para agrupar fácil.
  day: text("day").notNull(),
  loggedAt: integer("logged_at").notNull(),

  name: text("name").notNull(),
  calories: real("calories").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  fiber: real("fiber").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  sugar: real("sugar").notNull().default(0),

  // Vitaminas/minerales destacados como JSON: [{name, amount, unit, pctDV}]
  vitamins: text("vitamins").notNull().default("[]"),

  // "photo" | "text" | "voice"
  source: text("source").notNull().default("text"),
  confidence: text("confidence").notNull().default("media"),
  notes: text("notes").notNull().default(""),

  // Calificación del nutriólogo (0-10) + consejo corto en porciones reales.
  score: real("score").notNull().default(0),
  tip: text("tip").notNull().default(""),
});

/**
 * Registro de peso diario.
 */
export const weights = sqliteTable("weights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull().unique(),
  weightKg: real("weight_kg").notNull(),
  loggedAt: integer("logged_at").notNull(),
});

export type Meal = typeof meals.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Weight = typeof weights.$inferSelect;
