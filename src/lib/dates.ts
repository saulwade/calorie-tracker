/** Devuelve el día local (del navegador) en formato YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formato amigable: "lunes 16 de junio". */
export function prettyDay(dayStr: string): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Día relativo legible (Hoy / Ayer / fecha). */
export function relativeDay(dayStr: string, today: string): string {
  if (dayStr === today) return "Hoy";
  const [y, m, d] = today.split("-").map(Number);
  const yesterday = new Date(y, m - 1, d - 1);
  const yStr = `${yesterday.getFullYear()}-${String(
    yesterday.getMonth() + 1,
  ).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (dayStr === yStr) return "Ayer";
  return prettyDay(dayStr);
}
