"use client";

import { useState } from "react";
import { scoreColor } from "./MealRow";
import { SparkleIcon } from "./icons";

type Coaching = {
  dayScore: number;
  verdict: string;
  good: string[];
  improve: string[];
};

export default function Coach({ day }: { day: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Coaching | null>(null);
  const [msg, setMsg] = useState("");

  async function evaluate() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/coach?day=${day}`);
      const data = await res.json();
      if (data.empty) {
        setMsg(data.message);
        setResult(null);
      } else if (!res.ok) {
        setMsg(data.error ?? "Error");
      } else {
        setResult(data.coaching);
      }
    } catch {
      setMsg("No se pudo evaluar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-3">
      {!result ? (
        <button
          onClick={evaluate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Evaluando tu día…
            </>
          ) : (
            <>
              <SparkleIcon size={15} />
              Calificar mi día con el nutriólogo
            </>
          )}
        </button>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[17px] font-bold tabular-nums text-white"
              style={{ background: scoreColor(result.dayScore) }}
            >
              {Math.round(result.dayScore * 10) / 10}
            </div>
            <p className="text-[13px] leading-snug text-[var(--color-text)]">
              {result.verdict}
            </p>
          </div>

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
            onClick={evaluate}
            disabled={loading}
            className="mt-3 text-[12px] text-[var(--color-muted)] underline"
          >
            {loading ? "Evaluando…" : "Volver a evaluar"}
          </button>
        </div>
      )}

      {msg && (
        <p className="mt-2 text-center text-[13px] text-[var(--color-muted)]">
          {msg}
        </p>
      )}
    </div>
  );
}
