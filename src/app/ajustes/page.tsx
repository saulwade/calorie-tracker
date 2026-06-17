"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/db/schema";
import Nav from "@/components/Nav";

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentario (poco o nada de ejercicio)",
  light: "Ligero (ejercicio 1-3 días/sem)",
  moderate: "Moderado (ejercicio 3-5 días/sem)",
  active: "Activo (ejercicio 6-7 días/sem)",
  very_active: "Muy activo (trabajo físico / atleta)",
};

export default function SettingsPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setP(d.profile));
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setP((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function save() {
    if (!p) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sex: p.sex,
        age: p.age,
        heightCm: p.heightCm,
        startWeightKg: p.startWeightKg,
        goalWeightKg: p.goalWeightKg,
        activity: p.activity,
        deficit: p.deficit,
      }),
    });
    const data = await res.json();
    setP(data.profile);
    setSaving(false);
    setSaved(true);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!p) {
    return (
      <div className="grid min-h-screen place-items-center text-[var(--color-muted)]">
        Cargando…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Tus datos definen las metas diarias (se recalculan al guardar).
        </p>
      </header>

      <section className="mb-4 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-4">
        <Field label="Sexo">
          <div className="flex gap-2">
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                onClick={() => set("sex", s)}
                className={`flex-1 rounded-xl border py-2 text-sm ${
                  p.sex === s
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                {s === "male" ? "Hombre" : "Mujer"}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Edad">
            <NumberInput
              value={p.age}
              onChange={(v) => set("age", v)}
              suffix="años"
            />
          </Field>
          <Field label="Estatura">
            <NumberInput
              value={p.heightCm}
              onChange={(v) => set("heightCm", v)}
              suffix="cm"
            />
          </Field>
          <Field label="Peso inicial">
            <NumberInput
              value={p.startWeightKg}
              onChange={(v) => set("startWeightKg", v)}
              suffix="kg"
              step={0.1}
            />
          </Field>
          <Field label="Peso meta">
            <NumberInput
              value={p.goalWeightKg}
              onChange={(v) => set("goalWeightKg", v)}
              suffix="kg"
              step={0.1}
            />
          </Field>
        </div>

        <Field label="Nivel de actividad">
          <select
            value={p.activity}
            onChange={(e) => set("activity", e.target.value as Profile["activity"])}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Déficit calórico: ${p.deficit} kcal/día`}>
          <input
            type="range"
            min={250}
            max={1000}
            step={50}
            value={p.deficit}
            onChange={(e) => set("deficit", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            ~{((p.deficit * 7) / 7700).toFixed(2)} kg/semana. Más déficit = bajas
            más rápido pero con más hambre.
          </p>
        </Field>
      </section>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-4">
        <h2 className="mb-3 text-sm font-medium text-[var(--color-muted)]">
          Metas diarias calculadas
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Goal label="Calorías" value={`${p.targetCalories} kcal`} accent />
          <Goal label="Proteína" value={`${p.targetProtein} g`} />
          <Goal label="Carbohidratos" value={`${p.targetCarbs} g`} />
          <Goal label="Grasas" value={`${p.targetFat} g`} />
          <Goal label="Fibra" value={`${p.targetFiber} g`} />
          <Goal label="Azúcar (máx)" value={`${p.targetSugar} g`} />
          <Goal label="Sodio (máx)" value={`${p.targetSodium} mg`} />
        </div>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="mb-3 w-full rounded-full bg-[var(--color-accent)] py-3 font-medium text-[var(--color-on-accent)] active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar y recalcular"}
      </button>

      <button
        onClick={logout}
        className="w-full rounded-xl border border-[var(--color-border)] py-3 text-sm text-[var(--color-muted)]"
      >
        Cerrar sesión
      </button>

      <Nav />
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--color-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 focus-within:border-[var(--color-accent)]">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent py-2.5 outline-none"
      />
      {suffix && (
        <span className="text-xs text-[var(--color-muted)]">{suffix}</span>
      )}
    </div>
  );
}

function Goal({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
      <div className="text-[11px] text-[var(--color-muted)]">{label}</div>
      <div
        className={`font-semibold tabular-nums ${
          accent ? "text-[var(--color-accent)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
