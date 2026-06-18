/** Hora local "8:45" a partir de un timestamp (epoch ms). */
export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  });
}

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

/** Resta/suma n días a un YYYY-MM-DD (calendario local) y devuelve YYYY-MM-DD. */
export function addDays(dayStr: string, n: number): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/**
 * Racha: nº de días CONSECUTIVOS con al menos 1 comida, terminando hoy o ayer.
 * Si hoy aún no registra nada, la racha NO se rompe (se ancla en ayer).
 */
export function calcStreak(loggedDays: Iterable<string>, today: string): number {
  const set = loggedDays instanceof Set ? loggedDays : new Set(loggedDays);
  let cursor: string;
  if (set.has(today)) {
    cursor = today;
  } else {
    const yesterday = addDays(today, -1);
    if (!set.has(yesterday)) return 0;
    cursor = yesterday;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Racha "amable": como calcStreak, pero tolera UN día saltado dentro de la
 * racha (un "freeze"), para no castigar un descuido aislado. Devuelve también
 * si se usó el freeze, para mostrarlo con un tono no-punitivo.
 */
export function calcStreakInfo(
  loggedDays: Iterable<string>,
  today: string,
): { streak: number; frozen: boolean } {
  const set = loggedDays instanceof Set ? loggedDays : new Set(loggedDays);

  // Ancla: hoy o ayer; si tampoco ayer, la racha está rota.
  let cursor: string;
  if (set.has(today)) cursor = today;
  else if (set.has(addDays(today, -1))) cursor = addDays(today, -1);
  else return { streak: 0, frozen: false };

  let streak = 0;
  let freezeUsed = false;
  while (true) {
    if (set.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else if (!freezeUsed && set.has(addDays(cursor, -1))) {
      // Un solo hueco permitido: lo "congelamos" y seguimos contando.
      freezeUsed = true;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return { streak, frozen: freezeUsed };
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
