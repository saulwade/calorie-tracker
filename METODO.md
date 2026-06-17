# Cómo se calcula la nutrición (documento técnico, para el dueño)

Este archivo explica de dónde salen TODOS los números de la app y cómo se calculan,
para que puedas confiar en que el código está bien. **Nada de esto se muestra en la
UI** (el usuario solo ve los números finales limpios), pero el detalle por comida
(ingredientes, fuente, confianza, razonamiento) **sí se guarda en la base de datos**.

---

## 1. Metas diarias (100% determinista — nunca varían)

Archivo: `src/lib/nutrition.ts` → `calcTargets()`. Fórmula estándar:

- **BMR** (gasto en reposo) — Mifflin-St Jeor:
  `10·peso(kg) + 6.25·estatura(cm) − 5·edad + 5` (hombre) / `−161` (mujer).
- **TDEE** (gasto total) = BMR × factor de actividad
  (sedentario 1.2 · ligero 1.375 · moderado 1.55 · activo 1.725 · muy activo 1.9).
- **Calorías meta** = TDEE − déficit, con piso de seguridad = `max(mínimo por sexo, 90% del BMR)`
  (nunca sugiere comer peligrosamente poco).
- **Proteína** = 2.0 g/kg del peso META (ISSN, para conservar músculo en déficit).
- **Grasa** = 25% de las calorías, con piso de 0.6 g/kg (grasa esencial).
- **Carbohidratos** = el resto de las calorías.
- **Fibra** = 14 g por cada 1000 kcal (Dietary Guidelines / IOM).
- **Azúcar** = límite ≈ 10% de las calorías (OMS).
- **Sodio** = 2300 mg (límite AHA/FDA).

> El plan se recalcula con el **peso más reciente** registrado (se ajusta solo conforme bajas).
> Estos números son aritmética pura: mismos datos → mismo resultado, siempre.

---

## 2. Nutrición por comida (la parte robusta)

Principio (como Cronometer): **la IA decide QUÉ y CUÁNTO; la base de datos dice CUÁNTO NUTRE.**
La IA nunca inventa los números nutricionales.

### Flujo (`src/lib/anthropic.ts` → `analyzeFood` + `src/lib/usda.ts`)

1. **Claude (Sonnet, temperatura 0.2)** descompone la comida (texto y/o foto) en
   **ingredientes con gramos** y un término de búsqueda en inglés para USDA.
   Ej: `[{nombre:"Pechuga de pollo", usdaQuery:"chicken breast cooked", gramos:180}, ...]`.
   La temperatura baja hace que la descomposición sea **reproducible**.
2. **Por cada ingrediente** se consulta **USDA FoodData Central** (base oficial del USDA, gratis):
   - Endpoint: `GET https://api.nal.usda.gov/fdc/v1/foods/search` con `dataType=Foundation,SR Legacy`.
   - Se toma el primer resultado y sus nutrientes **por 100 g**.
   - Nutriente = `valor_por_100g × (gramos / 100)`. Aritmética pura → determinista.
3. **Suma** de todos los ingredientes = totales de la comida (calorías, macros, fibra,
   sodio, azúcar y 9 micronutrientes).
4. **Fallback:** si USDA no encuentra un ingrediente o falla (rate limit / sin llave),
   se usa la estimación de respaldo que dio la IA para ESE ingrediente (micros = 0).
   Así nunca se rompe; cada ingrediente queda marcado como fuente `USDA` o `estimado`.

### Nutrientes de USDA (por `nutrientNumber`)
208 kcal · 203 proteína · 204 grasa · 205 carbs · 291 fibra · 307 sodio · 269 azúcar ·
303 hierro · 306 potasio · 304 magnesio · 309 zinc · 301 calcio · 401 vit C ·
328 vit D (µg; si solo hay 324 en UI → /40) · 418 B12 · omega-3 = 851(ALA)+629(EPA)+621(DHA)+631(DPA).

### Qué se guarda por comida (en la DB, oculto en la UI)
`items` (desglose por ingrediente: nombre, gramos, kcal, fuente), `notes` (razonamiento),
`confidence` (alta/media/baja según certeza de la PORCIÓN), `score` y `tip` (coaching).

### Dónde está la incertidumbre
En el **tamaño de porción** (los gramos). La identificación y los valores nutricionales
son sólidos; lo único que se estima a ojo es cuántos gramos comiste — igual que cualquier
app o nutriólogo. Por eso conviene: foto + descripción, o foto de la etiqueta.

---

## 3. Micronutrientes (energía)

Metas (RDA hombre adulto, `MICRO_TARGETS` en `nutrition.ts`): hierro 8mg, potasio 3400mg,
magnesio 400mg, zinc 11mg, calcio 1000mg, vit C 90mg, vit D 15µg, B12 2.4µg, omega-3 1.6g.
Los valores diarios se suman de las comidas (vienen de USDA por ingrediente).

## 4. Alertas (sin IA, `src/lib/alerts.ts`)
Se calculan de los datos vs tus metas: "Alto en sodio/azúcar" (>40% del límite diario en una
sola comida), "Muchas calorías" (>40% de la meta), "Poco nutritivo" (score < 4).

## 5. Modelos y costo
- Análisis de comida, coach y guía: **Claude Sonnet 4.6** (`ANTHROPIC_MODEL`).
- USDA FoodData Central: **gratis** (llave gratis en https://fdc.nal.usda.gov/api-key-signup; ~1000 req/hora). Sin costo.
- Costo aproximado: ~$1–2 USD/mes en Claude para uso personal.

## 6. Consistencia (por qué ahora sí da confianza)
- Metas diarias: aritmética → idénticas siempre.
- Por comida: temperatura 0.2 (descomposición estable) + USDA (valores fijos) →
  **el mismo platillo da el mismo resultado.** Verificado: registrar 2 veces lo mismo = idéntico.
