"use client";

import type { Profile } from "@/db/schema";
import { FlameIcon } from "./icons";
import { CalorieRing, MacroBar } from "./Stats";

export type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

export default function TotalsBar({
  totals,
  profile,
  open,
  onToggle,
}: {
  totals: Totals;
  profile: Profile;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-3">
      {open && (
        <div className="mb-2 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 soft-shadow">
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
