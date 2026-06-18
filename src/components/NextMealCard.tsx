"use client";

import type { Profile } from "@/db/schema";
import { nextMealPlan, type NextMealInput, type NextRec } from "@/lib/nextmeal";
import { SparkleIcon, LeafIcon } from "./icons";

function recIcon(kind: NextRec["kind"]) {
  if (kind === "avoid") return "⚠️";
  if (kind === "add") return "＋";
  if (kind === "macro") return "🍗";
  return "✓";
}

export default function NextMealCard({
  totals,
  profile,
  mealsLogged,
}: {
  totals: NextMealInput;
  profile: Profile;
  mealsLogged: number;
}) {
  const plan = nextMealPlan(totals, profile, mealsLogged);
  const warn = plan.tone === "warn";

  // Color distinto al resto del chat: verde menta (ok) o ámbar (cuidado).
  const accent = warn ? "var(--color-cal)" : "var(--color-fat)";

  return (
    <div
      className="row-in mb-3 rounded-2xl border p-3.5"
      style={{
        borderColor: warn
          ? "color-mix(in srgb, var(--color-cal) 35%, transparent)"
          : "color-mix(in srgb, var(--color-fat) 30%, transparent)",
        background: warn
          ? "color-mix(in srgb, var(--color-cal) 8%, var(--color-surface))"
          : "color-mix(in srgb, var(--color-fat) 7%, var(--color-surface))",
      }}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span className="flex items-center" style={{ color: accent }}>
          {warn ? <SparkleIcon size={14} /> : <LeafIcon size={15} />}
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-wide"
          style={{ color: accent }}
        >
          {plan.headline}
        </span>
        <span className="ml-auto text-[10px] font-medium text-[var(--color-muted)]">
          Coach IA
        </span>
      </div>
      <ul className="space-y-1.5">
        {plan.recs.map((r, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-[var(--color-text)]">
            <span className="mt-px shrink-0" style={{ width: 16 }}>
              {recIcon(r.kind)}
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
