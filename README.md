# 🥗 Mis Calorías

Tracker personal de calorías y macros. Registra lo que comes con **foto, texto o voz**, y Claude (IA) estima calorías, proteínas, carbohidratos, grasas, fibra, sodio, azúcar y vitaminas. Pensado para **una sola persona** y para **bajar de peso**.

## Qué hace

- **Hoy**: anillo de calorías + barras de macros (proteína/carbos/grasa) + fibra/azúcar/sodio. Registras comida con 📷 foto / ✍️ texto / 🎤 voz.
- **Historial**: totales por día con promedio.
- **Peso**: registras tu peso y ves el progreso hacia tu meta.
- **Ajustes**: tus datos (edad, estatura, peso, actividad, déficit) → recalcula tus metas diarias automáticamente.

---

## 1) Probar en tu compu (desarrollo)

1. **Pon tu llave de Claude.** Abre el archivo `.env.local` y reemplaza la línea de la llave por tu llave real (la sacas de https://console.anthropic.com/settings/keys):

   ```
   ANTHROPIC_API_KEY=sk-ant-...tu-llave-real...
   ```

   (Opcional) cambia `APP_PASSWORD=tracker` por la contraseña que quieras.

   **Recomendado — nutrición precisa:** saca una llave gratis de USDA FoodData Central en https://fdc.nal.usda.gov/api-key-signup (1 min, te llega por correo) y ponla en `USDA_API_KEY=`. Con ella, la nutrición de cada comida se calcula con la base de datos oficial del USDA (precisa y consistente) en vez de estimarse. Sin ella, la app sigue funcionando con estimación de IA.

2. **Arranca la app:**

   ```bash
   npm run dev
   ```

3. Abre lo que diga la terminal (normalmente http://localhost:3000). Entra con tu contraseña y ¡listo!

> En local los datos se guardan en un archivo `local.db` en esta carpeta. No se sube a internet.

---

## 2) Subirla a internet (para usarla desde el celular)

### Paso A — Crear la base de datos en Turso (gratis)

1. Crea cuenta en https://turso.tech
2. Instala su CLI y crea una base:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth signup
   turso db create mis-calorias
   turso db show mis-calorias --url        # -> copia esta URL (libsql://...)
   turso db tokens create mis-calorias     # -> copia este token
   ```
3. Crea las tablas en Turso (apuntando a tu base remota):
   ```bash
   TURSO_DATABASE_URL="libsql://...tu-url..." TURSO_AUTH_TOKEN="...tu-token..." npx drizzle-kit push --force
   ```

### Paso B — Deploy en Vercel (gratis)

1. Sube este proyecto a GitHub (privado).
2. Entra a https://vercel.com, importa el repo.
3. En **Environment Variables** de Vercel agrega:
   - `ANTHROPIC_API_KEY` = tu llave de Claude
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-6` (barato y preciso; o `claude-opus-4-6` para máxima precisión)
   - `TURSO_DATABASE_URL` = la URL de Turso (libsql://...)
   - `TURSO_AUTH_TOKEN` = el token de Turso
   - `APP_PASSWORD` = tu contraseña
4. Deploy. Vercel te da una URL (ej. `mis-calorias.vercel.app`). Ábrela en el celular y agrégala a la pantalla de inicio para que parezca app.

---

## Notas

- **Privacidad:** la app está protegida con contraseña (`APP_PASSWORD`). Es para ti nada más.
- **Costo:** cada análisis de comida es una llamada a Claude (centavos). El modelo se cambia con `ANTHROPIC_MODEL`.
- **Voz:** el dictado usa el navegador (gratis). Funciona mejor en Chrome/Safari.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · Turso/libSQL (SQLite) · Anthropic SDK (Claude).
