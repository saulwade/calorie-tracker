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

  // Gasto estimado por datos (0 = sin datos suficientes; se usa la fórmula).
  estimatedTdee: integer("estimated_tdee").notNull().default(0),

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

  // Micronutrientes clave para energía (sumables, unidades fijas).
  iron: real("iron").notNull().default(0), // mg
  potassium: real("potassium").notNull().default(0), // mg
  magnesium: real("magnesium").notNull().default(0), // mg
  zinc: real("zinc").notNull().default(0), // mg
  calcium: real("calcium").notNull().default(0), // mg
  vitC: real("vit_c").notNull().default(0), // mg
  vitD: real("vit_d").notNull().default(0), // mcg
  vitB12: real("vit_b12").notNull().default(0), // mcg
  omega3: real("omega3").notNull().default(0), // g

  // Desglose por ingrediente (JSON): [{nombre, gramos, kcal, fuente}]
  items: text("items").notNull().default("[]"),
});

/**
 * Comidas guardadas como favoritas (registro rápido sin IA).
 * Columnas espejo de meals (sin day/loggedAt/source/confidence).
 */
export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  calories: real("calories").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  fiber: real("fiber").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  vitamins: text("vitamins").notNull().default("[]"),
  score: real("score").notNull().default(0),
  tip: text("tip").notNull().default(""),
  createdAt: integer("created_at").notNull().default(0),

  // Micronutrientes + desglose (para no perderlos al registrar desde favorito).
  iron: real("iron").notNull().default(0),
  potassium: real("potassium").notNull().default(0),
  magnesium: real("magnesium").notNull().default(0),
  zinc: real("zinc").notNull().default(0),
  calcium: real("calcium").notNull().default(0),
  vitC: real("vit_c").notNull().default(0),
  vitD: real("vit_d").notNull().default(0),
  vitB12: real("vit_b12").notNull().default(0),
  omega3: real("omega3").notNull().default(0),
  items: text("items").notNull().default("[]"),
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
export type Favorite = typeof favorites.$inferSelect;
