"use client";

import { useEffect, useState } from "react";
import { scoreColor } from "./MealRow";
import { SparkleIcon } from "./icons";

type Week = {
  weekScore: number;
  verdict: string;
  tendencia: string;
  good: string[];
  improve: string[];
};

export default function WeeklySummary() {
  const [result, setResult] = useState<Week | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/coach/week?peek=1")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.coaching) {
          setResult(d.coaching);
          setStale(Boolean(d.stale));
        }
        setPeeked(true);
      })
      .catch(() => setPeeked(true));
    return () => {
      alive = false;
    };
  }, []);

  async function evaluate(refresh = false) {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/coach/week${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();
      if (data.empty) setMsg(data.message);
      else if (!res.ok) setMsg(data.error ?? "Error");
      else {
        setResult(data.coaching);
        setStale(false);
      }
    } catch {
      setMsg("No se pudo generar el resumen. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
      <h2 className="mb-3 text-sm font-medium text-[var(--color-muted)]">
        Resumen semanal · Coach IA
      </h2>

      {!result ? (
        <button
          onClick={() => evaluate(false)}
          disabled={loading || !peeked}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Analizando tu semana…
            </>
          ) : (
            <>
              <SparkleIcon size={15} />
              Generar resumen de la semana
            </>
          )}
        </button>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[17px] font-bold tabular-nums text-white"
              style={{ background: scoreColor(result.weekScore) }}
            >
              {Math.round(result.weekScore * 10) / 10}
            </div>
            <div>
              <p className="text-[13px] leading-snug text-[var(--color-text)]">
                {result.verdict}
              </p>
              {result.tendencia && (
                <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
                  {result.tendencia}
                </p>
              )}
            </div>
          </div>

          {stale && (
            <p className="mb-2 text-[12px] text-[var(--color-cal)]">
              Registraste cambios esta semana. Vuelve a generar para actualizar.
            </p>
          )}

          {result.good.length > 0 && (
            <ul className="mb-2 space-y-1">
              {result.good.map((g, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--color-text)]">
                  <span style={{ color: "var(--color-fat)" }}>✓</span>
                  {g}
                </li>
              ))}
            </ul>
          )}
          {result.improve.length > 0 && (
            <ul className="space-y-1">
              {result.improve.map((t, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--color-text)]">
                  <span style={{ color: "var(--color-accent)" }}>→</span>
                  {t}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => evaluate(true)}
            disabled={loading}
            className="mt-3 text-[12px] text-[var(--color-muted)] underline"
          >
            {loading ? "Generando…" : "Volver a generar"}
          </button>
        </div>
      )}

      {msg && (
        <p className="mt-2 text-center text-[13px] text-[var(--color-muted)]">{msg}</p>
      )}
    </section>
  );
}
