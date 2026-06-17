/**
 * Rate limit en memoria (por instancia del servidor). Suficiente para una app
 * personal: tope de llamadas costosas (IA) por si la cookie se filtra o hay un bug.
 */
const hits = new Map<string, number[]>();

export function allow(key: string, max = 15, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

/** Respuesta 429 estándar. */
export function tooMany() {
  return Response.json(
    { error: "Demasiadas solicitudes seguidas. Espera un momento." },
    { status: 429 },
  );
}
