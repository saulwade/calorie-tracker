"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { LeafIcon, SparkleIcon } from "@/components/icons";

type Idea = { nombre: string; kcal: number; porque: string };
type Guide = {
  focus: string;
  evita: string[];
  comeMas: string[];
  condimentos: string[];
  desayunos: Idea[];
  comidas: Idea[];
  cenas: Idea[];
};

const LS_GUIDE = "pct_guide_v2";
const LS_FOODS = "pct_foods";

export default function GuidePage() {
  const [foods, setFoods] = useState("");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // recuperar la última guía guardada (para no regenerar y no gastar IA)
  useEffect(() => {
    try {
      const g = localStorage.getItem(LS_GUIDE);
      const f = localStorage.getItem(LS_FOODS);
      if (g) setGuide(JSON.parse(g));
      if (f) setFoods(f);
    } catch {}
  }, []);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foods: foods.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setGuide(data.guide);
      try {
        localStorage.setItem(LS_GUIDE, JSON.stringify(data.guide));
        localStorage.setItem(LS_FOODS, foods.trim());
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LeafIcon size={24} className="text-[var(--color-fat)]" />
          Comer limpio
        </h1>
        <p className="text-[13px] text-[var(--color-muted)]">
          Tu guía para comer bien, con energía y bajar de peso.
        </p>
      </header>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 soft-shadow">
        <label className="mb-1.5 block text-[13px] font-medium">
          ¿Qué sueles comer o tienes en casa?
        </label>
        <textarea
          value={foods}
          onChange={(e) => setFoods(e.target.value)}
          rows={3}
          placeholder="Ej: huevo, tortilla, frijoles, pechuga de pollo, salmón, atún de sobre, arroz, verduras, queso panela…"
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)]"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Armando tu guía…
            </>
          ) : (
            <>
              <SparkleIcon size={15} />
              {guide ? "Actualizar mi guía" : "Generar mi guía"}
            </>
          )}
        </button>
        {error && (
          <p className="mt-2 text-center text-[13px] text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </section>

      {guide && (
        <div className="space-y-4">
          {guide.focus && (
            <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Enfoque de la semana
              </p>
              <p className="mt-1 text-[14px] leading-snug text-[var(--color-text)]">
                {guide.focus}
              </p>
            </div>
          )}

          <ListCard
            title="Deja de comprar"
            color="var(--color-danger)"
            symbol="✕"
            items={guide.evita}
          />
          <ListCard
            title="Come más"
            color="var(--color-fat)"
            symbol="✓"
            items={guide.comeMas}
          />
          <ListCard
            title="Condimentos para dar sabor (sin sal ni azúcar)"
            color="var(--color-cal)"
            symbol="•"
            items={guide.condimentos ?? []}
          />

          <MealIdeas title="Desayuno" ideas={guide.desayunos ?? []} />
          <MealIdeas title="Comida" ideas={guide.comidas ?? []} />
          <MealIdeas title="Cena" ideas={guide.cenas ?? []} />
        </div>
      )}

      {!guide && !loading && (
        <p className="px-2 text-center text-[13px] text-[var(--color-muted)]">
          Escribe tus alimentos y genera tu guía personalizada. Se guarda para
          que no gastes de más.
        </p>
      )}

      <Nav />
    </main>
  );
}

function MealIdeas({ title, ideas }: { title: string; ideas: Idea[] }) {
  if (ideas.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 soft-shadow">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-3">
        {ideas.map((idea, i) => (
          <div
            key={i}
            className="border-b border-[var(--color-border)]/70 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--color-accent)]">
                Opción {i + 1}
              </span>
              <span className="text-[12px] tabular-nums text-[var(--color-muted)]">
                ~{Math.round(idea.kcal)} cal
              </span>
            </div>
            <p className="mt-0.5 text-[14px] font-medium text-[var(--color-text)]">
              {idea.nombre}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
              {idea.porque}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListCard({
  title,
  color,
  symbol,
  items,
}: {
  title: string;
  color: string;
  symbol: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 soft-shadow">
      <h2 className="mb-2.5 text-sm font-semibold" style={{ color }}>
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-[var(--color-text)]">
            <span className="mt-0.5 shrink-0 font-bold" style={{ color }}>
              {symbol}
            </span>
            {it}
          </li>
        ))}
      </ul>
    </section>
  );
}
