"use client";

import { useState } from "react";
import type { Meal } from "@/db/schema";

const SOURCE_ICON: Record<string, string> = {
  photo: "📷",
  voice: "🎤",
  text: "✍️",
};

const CONF_COLOR: Record<string, string> = {
  alta: "var(--color-accent)",
  media: "var(--color-carbs)",
  baja: "var(--color-danger)",
};

export default function MealCard({
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
  } catch {
    vitamins = [];
  }

  const time = new Date(meal.loggedAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function del() {
    setDeleting(true);
    await fetch(`/api/meals?id=${meal.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="text-lg">{SOURCE_ICON[meal.source] ?? "✍️"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{meal.name}</p>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted)]">
            <span>{time}</span>
            <span className="text-[var(--color-protein)]">
              P {Math.round(meal.protein)}g
            </span>
            <span className="text-[var(--color-carbs)]">
              C {Math.round(meal.carbs)}g
            </span>
            <span className="text-[var(--color-fat)]">
              G {Math.round(meal.fat)}g
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums">
            {Math.round(meal.calories)}
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">kcal</div>
        </div>
      </button>

      {open && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Detail label="Fibra" value={`${Math.round(meal.fiber)}g`} />
            <Detail label="Azúcar" value={`${Math.round(meal.sugar)}g`} />
            <Detail label="Sodio" value={`${Math.round(meal.sodium)}mg`} />
          </div>

          {vitamins.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-[var(--color-muted)]">
                Vitaminas/minerales
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vitamins.map((v, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-xs"
                  >
                    {v.name}: {v.amount}
                    {v.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {meal.notes && (
            <p className="mt-3 text-xs italic text-[var(--color-muted)]">
              {meal.notes}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span
              className="text-xs"
              style={{ color: CONF_COLOR[meal.confidence] }}
            >
              Confianza: {meal.confidence}
            </span>
            <button
              onClick={del}
              disabled={deleting}
              className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
            >
              {deleting ? "Borrando…" : "🗑 Borrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-2)] p-2">
      <div className="text-[10px] uppercase text-[var(--color-muted)]">
        {label}
      </div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}
