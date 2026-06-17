"use client";

import { useState } from "react";
import type { Meal, Profile } from "@/db/schema";
import { SparkleIcon, TrashIcon, SendIcon, StarIcon } from "./icons";
import { mealAlerts } from "@/lib/alerts";

export function scoreColor(s: number): string {
  if (s >= 8) return "var(--color-fat)"; // verde
  if (s >= 6) return "var(--color-protein)"; // ámbar
  if (s >= 4) return "var(--color-cal)"; // naranja
  return "var(--color-danger)"; // rojo
}

function fmtScore(s: number): string {
  return (Math.round(s * 10) / 10).toString();
}

function AlertChip({
  alert,
}: {
  alert: { label: string; level: "warn" | "danger" };
}) {
  const cls =
    alert.level === "danger"
      ? "text-[var(--color-danger)] bg-[var(--color-danger)]/10"
      : "text-[var(--color-cal)] bg-[var(--color-cal)]/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {alert.label}
    </span>
  );
}

export default function MealRow({
  meal,
  profile,
  onChanged,
}: {
  meal: Meal;
  profile: Profile | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [correction, setCorrection] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingFav, setSavingFav] = useState(false);
  const [faved, setFaved] = useState(false);

  const alerts = mealAlerts(meal, profile);
  const [fields, setFields] = useState({
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  });

  async function del() {
    setDeleting(true);
    await fetch(`/api/meals?id=${meal.id}`, { method: "DELETE" });
    onChanged();
  }

  async function adjust() {
    if (!correction.trim()) return;
    setAdjusting(true);
    await fetch(`/api/meals?id=${meal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correction: correction.trim() }),
    });
    setCorrection("");
    setAdjusting(false);
    onChanged();
  }

  async function saveManual() {
    setSaving(true);
    await fetch(`/api/meals?id=${meal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manual: fields }),
    });
    setSaving(false);
    setManual(false);
    onChanged();
  }

  async function saveFavorite() {
    setSavingFav(true);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId: meal.id }),
    });
    setSavingFav(false);
    setFaved(true);
  }

  return (
    <div className="row-in border-b border-[var(--color-border)]/70">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-4 py-3.5 text-left transition active:opacity-70"
      >
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="text-[15px] leading-snug text-[var(--color-text)]">
            {meal.name}
          </span>
          {alerts.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {alerts.map((a) => (
                <AlertChip key={a.label} alert={a} />
              ))}
            </span>
          )}
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
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-[13px] leading-snug">
              <span
                className="mt-0.5 shrink-0 font-semibold tabular-nums"
                style={{ color: scoreColor(meal.score) }}
              >
                {fmtScore(meal.score)}
              </span>
              <span className="text-[var(--color-text)]">{meal.tip}</span>
            </div>
          )}

          {!manual ? (
            <>
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

              {/* Ajustar por chat */}
              <div className="mb-2 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-1">
                <input
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") adjust();
                  }}
                  placeholder='Ajustar: "duplica la porción", "sin queso"…'
                  className="flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-[var(--color-muted)]"
                />
                <button
                  onClick={adjust}
                  disabled={adjusting || !correction.trim()}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white disabled:bg-[var(--color-border)] disabled:text-[var(--color-muted)]"
                  aria-label="Ajustar"
                >
                  {adjusting ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <SendIcon size={15} />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={saveFavorite}
                    disabled={savingFav || faved}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10 disabled:opacity-50"
                  >
                    <StarIcon size={14} />
                    {faved ? "Guardado" : savingFav ? "…" : "Favorito"}
                  </button>
                  <button
                    onClick={() => setManual(true)}
                    className="rounded-full px-3 py-1.5 text-[12px] text-[var(--color-muted)]"
                  >
                    Corregir
                  </button>
                </div>
                <button
                  onClick={del}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-[var(--color-danger)] transition hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
                >
                  <TrashIcon size={14} />
                  {deleting ? "Borrando…" : "Borrar"}
                </button>
              </div>
            </>
          ) : (
            /* Editar a mano */
            <div className="space-y-2">
              <input
                value={fields.name}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[14px] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="grid grid-cols-4 gap-2">
                <NumField label="kcal" value={fields.calories} onChange={(v) => setFields({ ...fields, calories: v })} />
                <NumField label="Prot" value={fields.protein} onChange={(v) => setFields({ ...fields, protein: v })} />
                <NumField label="Carb" value={fields.carbs} onChange={(v) => setFields({ ...fields, carbs: v })} />
                <NumField label="Gras" value={fields.fat} onChange={(v) => setFields({ ...fields, fat: v })} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setManual(false)}
                  className="flex-1 rounded-full border border-[var(--color-border)] py-2 text-[13px] text-[var(--color-muted)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveManual}
                  disabled={saving}
                  className="flex-1 rounded-full bg-[var(--color-accent)] py-2 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          )}
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

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 focus-within:border-[var(--color-accent)]">
      <div className="text-[10px] text-[var(--color-muted)]">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent text-[14px] tabular-nums outline-none"
      />
    </div>
  );
}
