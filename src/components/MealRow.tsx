"use client";

import { useState } from "react";
import type { Meal } from "@/db/schema";
import { SparkleIcon, TrashIcon } from "./icons";

const CONF_LABEL: Record<string, string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

export function scoreColor(s: number): string {
  if (s >= 8) return "var(--color-fat)"; // verde
  if (s >= 6) return "var(--color-protein)"; // ámbar
  if (s >= 4) return "var(--color-cal)"; // naranja
  return "var(--color-danger)"; // rojo
}

function fmtScore(s: number): string {
  return (Math.round(s * 10) / 10).toString();
}

export default function MealRow({
  meal,
  onDeleted,
}: {
  meal: Meal;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  let vitamins: { name: string; amount: number; unit: string }[] = [];
  try {
    vitamins = JSON.parse(meal.vitamins);
  } catch {}

  async function del() {
    setDeleting(true);
    await fetch(`/api/meals?id=${meal.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div className="border-b border-[var(--color-border)]/70">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-4 py-3.5 text-left"
      >
        <span className="flex-1 text-[15px] leading-snug text-[var(--color-text)]">
          {meal.name}
        </span>
        <span className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1 whitespace-nowrap text-[15px]">
            <SparkleIcon size={12} className="text-[var(--color-accent)]" />
            <span className="font-medium tabular-nums text-[var(--color-text)]">
              {Math.round(meal.calories)}
            </span>
            <span className="text-[var(--color-muted)]">cal</span>
          </span>
          {meal.score > 0 && (
            <span
              className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{ color: scoreColor(meal.score) }}
            >
              {fmtScore(meal.score)}/10
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="pb-4 pl-0.5 pr-1">
          {meal.tip && (
            <div
              className="mb-3 flex items-start gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-[13px] leading-snug"
            >
              <span
                className="mt-0.5 shrink-0 font-semibold tabular-nums"
                style={{ color: scoreColor(meal.score) }}
              >
                {fmtScore(meal.score)}
              </span>
              <span className="text-[var(--color-text)]">{meal.tip}</span>
            </div>
          )}
          <div className="mb-3 flex gap-5 text-[13px]">
            <Macro label="Proteína" value={meal.protein} color="var(--color-protein)" />
            <Macro label="Carbos" value={meal.carbs} color="var(--color-carbs)" />
            <Macro label="Grasa" value={meal.fat} color="var(--color-fat)" />
          </div>

          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-muted)]">
            <span>Fibra {Math.round(meal.fiber)}g</span>
            <span>Azúcar {Math.round(meal.sugar)}g</span>
            <span>Sodio {Math.round(meal.sodium)}mg</span>
          </div>

          {vitamins.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {vitamins.map((v, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-muted)]"
                >
                  {v.name} {v.amount}
                  {v.unit}
                </span>
              ))}
            </div>
          )}

          {meal.notes && (
            <p className="mb-3 text-[12px] leading-relaxed text-[var(--color-muted)]">
              {meal.notes}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-muted)]">
              {CONF_LABEL[meal.confidence] ?? ""}
            </span>
            <button
              onClick={del}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-[var(--color-danger)] transition hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
            >
              <TrashIcon size={14} />
              {deleting ? "Borrando…" : "Borrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Macro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="font-medium tabular-nums text-[var(--color-text)]">
        {Math.round(value)}g
      </span>
      <span className="text-[var(--color-muted)]">{label}</span>
    </div>
  );
}
