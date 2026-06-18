"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { LeafIcon, SparkleIcon } from "@/components/icons";
import { localDay, relativeDay } from "@/lib/dates";

type Idea = { nombre: string; kcal: number; porque: string };
type ShopGroup = { categoria: string; items: string[] };
type Guide = {
  focus: string;
  compra: ShopGroup[];
  evita: string[];
  condimentos: string[];
  desayunos: Idea[];
  comidas: Idea[];
  cenas: Idea[];
};

// color por categoría de la lista del súper
const CAT_COLOR: Record<string, string> = {
  Carbohidratos: "var(--color-carbs)",
  Proteínas: "var(--color-protein)",
  Verduras: "var(--color-fat)",
  "Grasas buenas": "var(--color-cal)",
  Lácteos: "var(--color-accent)",
};

export default function GuidePage() {
  const [foods, setFoods] = useState("");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [genDate, setGenDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const today = localDay();

  // Carga la guía guardada en la BASE (sigue al usuario en todos los dispositivos).
  useEffect(() => {
    let alive = true;
    fetch("/api/guide")
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.guide) return;
        setGuide(d.guide);
        if (d.foods) setFoods(d.foods);
        if (d.createdAt) setGenDate(localDay(new Date(d.createdAt)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
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
      setGenDate(today);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar.");
    } finally {
      setLoading(false);
    }
  }

  const showInput = !guide || editing;

  return (
    <main className="mx-auto max-w-md px-5 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LeafIcon size={24} className="text-[var(--color-fat)]" />
          Comer limpio
        </h1>
        <p className="text-[13px] text-[var(--color-muted)]">
          Tu guía para comer bien y bajar de peso sin estrés.
        </p>
      </header>

      {/* Input: completo si no hay guía o estás editando; compacto si ya hay guía */}
      {showInput ? (
        <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 soft-shadow">
          <label className="mb-1.5 block text-[13px] font-medium">
            ¿Qué sueles comer o tienes en casa?
          </label>
          <textarea
            value={foods}
            onChange={(e) => setFoods(e.target.value)}
            rows={3}
            placeholder="Ej: huevo, tortilla, frijoles, pechuga de pollo, salmón, atún, arroz, verduras, queso panela, avena…"
            className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)]"
          />
          <div className="mt-3 flex gap-2">
            {guide && (
              <button
                onClick={() => setEditing(false)}
                className="rounded-full border border-[var(--color-border)] px-4 py-3 text-[13px] text-[var(--color-muted)]"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={generate}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Armando tu guía…
                </>
              ) : (
                <>
                  <SparkleIcon size={15} />
                  {guide ? "Generar nueva guía" : "Generar mi guía"}
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-center text-[13px] text-[var(--color-danger)]">
              {error}
            </p>
          )}
          {guide && (
            <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">
              Genera de nuevo cuando cambien tus alimentos o quieras variar las recetas.
            </p>
          )}
        </section>
      ) : (
        <section className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 soft-shadow">
          <div className="min-w-0">
            <p className="truncate text-[13px] text-[var(--color-text)]">
              {foods || "Tu guía personalizada"}
            </p>
            {genDate && (
              <p className="text-[11px] text-[var(--color-muted)]">
                Generada {relativeDay(genDate, today).toLowerCase()}
              </p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-full border border-[var(--color-border)] px-3 py-2 text-[12px] font-medium text-[var(--color-accent)] transition active:scale-95"
          >
            Editar / regenerar
          </button>
        </section>
      )}

      {loading && !guide && (
        <p className="px-2 pt-6 text-center text-[13px] text-[var(--color-muted)]">
          Armando tu guía personalizada…
        </p>
      )}

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

          {/* Lista del súper por grupos */}
          {guide.compra?.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 soft-shadow">
              <h2 className="mb-1 text-sm font-semibold">Tu lista del súper</h2>
              <p className="mb-3 text-[12px] text-[var(--color-muted)]">
                Compra de estos grupos y comes bien sin pensarle.
              </p>
              <div className="space-y-3.5">
                {guide.compra.map((g) => (
                  <div key={g.categoria}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CAT_COLOR[g.categoria] ?? "var(--color-muted)" }}
                      />
                      <span className="text-[13px] font-semibold text-[var(--color-text)]">
                        {g.categoria}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((it, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[12px] text-[var(--color-text)]"
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ListCard
            title="Deja de comprar"
            color="var(--color-danger)"
            symbol="✕"
            items={guide.evita}
          />
          <ListCard
            title="Condimentos que sí puedes usar"
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
          Escribe tus alimentos y genera tu guía. Se guarda para que no gastes de
          más.
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
      <div className="space-y-2.5">
        {ideas.map((idea, i) => (
          <div
            key={i}
            className="rounded-xl bg-[var(--color-surface-2)] p-3"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-accent)]">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-accent)] text-[11px] text-white">
                  {i + 1}
                </span>
                Opción {i + 1}
              </span>
              <span className="text-[12px] tabular-nums text-[var(--color-muted)]">
                ~{Math.round(idea.kcal)} cal
              </span>
            </div>
            <p className="text-[14px] font-medium leading-snug text-[var(--color-text)]">
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
          <li
            key={i}
            className="flex gap-2.5 text-[14px] leading-snug text-[var(--color-text)]"
          >
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
