"use client";

import type { Profile } from "@/db/schema";
import { FlameIcon, CloseIcon } from "./icons";
import { CalorieRing, MacroBar } from "./Stats";
import Coach from "./Coach";
import { MICRO_TARGETS, MICRO_ORDER, type MicroKey } from "@/lib/nutrition";

export type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  iron: number;
  potassium: number;
  magnesium: number;
  zinc: number;
  calcium: number;
  vitC: number;
  vitD: number;
  vitB12: number;
  omega3: number;
};

export default function TotalsBar({
  totals,
  profile,
  open,
  onToggle,
  day,
}: {
  totals: Totals;
  profile: Profile;
  open: boolean;
  onToggle: () => void;
  day: string;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-3">
      {open && (
        <div className="panel-in relative mb-2 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow">
          <button
            onClick={onToggle}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted)] transition active:scale-90"
          >
            <CloseIcon size={16} />
          </button>
          <div className="max-h-[calc(100dvh-210px)] overflow-y-auto overscroll-contain rounded-3xl p-5">
          <div className="mb-4 flex justify-center">
            <CalorieRing
              consumed={totals.calories}
              target={profile.targetCalories}
            />
          </div>
          <div className="space-y-3">
            <MacroBar
              label="Proteína"
              consumed={totals.protein}
              target={profile.targetProtein}
              color="var(--color-protein)"
            />
            <MacroBar
              label="Carbohidratos"
              consumed={totals.carbs}
              target={profile.targetCarbs}
              color="var(--color-carbs)"
            />
            <MacroBar
              label="Grasas"
              consumed={totals.fat}
              target={profile.targetFat}
              color="var(--color-fat)"
            />
          </div>
          <MacroSplit profile={profile} />

          <div className="mt-4 flex justify-between border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-muted)]">
            <span>
              Fibra{" "}
              <span className="text-[var(--color-text)]">
                {Math.round(totals.fiber)}
              </span>
              /{profile.targetFiber}g
            </span>
            <span>
              Azúcar{" "}
              <span className="text-[var(--color-text)]">
                {Math.round(totals.sugar)}
              </span>
              /{profile.targetSugar}g
            </span>
            <span>
              Sodio{" "}
              <span className="text-[var(--color-text)]">
                {Math.round(totals.sodium)}
              </span>
              /{profile.targetSodium}mg
            </span>
          </div>

          <MicroGrid totals={totals} />

          <Coach day={day} />
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-[14px] soft-shadow"
      >
        <span className="flex items-center gap-1.5">
          <FlameIcon size={16} className="text-[var(--color-cal)]" />
          <span className="font-semibold tabular-nums">
            {Math.round(totals.calories)}
          </span>
        </span>
        <Dot />
        <Stat letter="C" color="var(--color-carbs)" value={totals.carbs} />
        <Dot />
        <Stat letter="P" color="var(--color-protein)" value={totals.protein} />
        <Dot />
        <Stat letter="F" color="var(--color-fat)" value={totals.fat} />
      </button>
    </div>
  );
}

/** Distribución de macros del plan: barra apilada + gramos y % de las calorías. */
function MacroSplit({ profile }: { profile: Profile }) {
  const pKcal = profile.targetProtein * 4;
  const cKcal = profile.targetCarbs * 4;
  const fKcal = profile.targetFat * 9;
  const total = pKcal + cKcal + fKcal || 1;
  const pPct = Math.round((pKcal / total) * 100);
  const cPct = Math.round((cKcal / total) * 100);
  const fPct = 100 - pPct - cPct;

  const items = [
    { label: "Proteína", g: profile.targetProtein, pct: pPct, color: "var(--color-protein)" },
    { label: "Carbos", g: profile.targetCarbs, pct: cPct, color: "var(--color-carbs)" },
    { label: "Grasa", g: profile.targetFat, pct: fPct, color: "var(--color-fat)" },
  ];

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        Distribución del plan
      </p>
      <div className="mb-2.5 flex h-2.5 w-full overflow-hidden rounded-full">
        {items.map((it) => (
          <div key={it.label} style={{ width: `${it.pct}%`, background: it.color }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: it.color }}
              />
              <span className="text-[12px] text-[var(--color-muted)]">
                {it.label}
              </span>
            </div>
            <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
              {it.g}g
            </div>
            <div className="text-[11px] tabular-nums text-[var(--color-muted)]">
              {it.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Micronutrientes del día: barra por micro con indicador bajo/ok. */
function MicroGrid({ totals }: { totals: Totals }) {
  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-3">
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        Micronutrientes · energía
      </p>
      <div className="grid grid-cols-3 gap-x-3 gap-y-3">
        {MICRO_ORDER.map((key: MicroKey) => {
          const meta = MICRO_TARGETS[key];
          const value = totals[key];
          const ratio = meta.target > 0 ? value / meta.target : 0;
          const pct = Math.min(ratio * 100, 100);
          const color =
            ratio >= 0.8
              ? "var(--color-fat)"
              : ratio >= 0.5
                ? "var(--color-protein)"
                : "var(--color-danger)";
          const show = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="text-[12px] font-medium text-[var(--color-text)]">
                  {meta.label}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="mt-1 text-[11px] tabular-nums text-[var(--color-muted)]">
                {show}/{meta.target}
                {meta.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  letter,
  color,
  value,
}: {
  letter: string;
  color: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-1 tabular-nums">
      <span className="font-semibold" style={{ color }}>
        {letter}
      </span>
      <span>{Math.round(value)}</span>
    </span>
  );
}

function Dot() {
  return <span className="text-[var(--color-muted)]">·</span>;
}
