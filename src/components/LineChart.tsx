"use client";

export type Point = { label: string; value: number };

/**
 * Gráfica de línea minimalista en SVG (sin librerías).
 * - points: en orden cronológico (viejo -> nuevo)
 * - goal: línea de referencia punteada (meta)
 */
export default function LineChart({
  points,
  color = "var(--color-accent)",
  goal,
  unit = "",
  height = 140,
}: {
  points: Point[];
  color?: string;
  goal?: number;
  unit?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div
        className="grid place-items-center text-[13px] text-[var(--color-muted)]"
        style={{ height }}
      >
        Aún sin datos para graficar.
      </div>
    );
  }

  const W = 320;
  const H = height;
  const padX = 10;
  const padTop = 14;
  const padBottom = 22;

  const values = points.map((p) => p.value);
  const candidates = goal != null ? [...values, goal] : values;
  let min = Math.min(...candidates);
  let max = Math.max(...candidates);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  // margen del 8% arriba y abajo
  min -= span * 0.08;
  max += span * 0.08;

  const x = (i: number) =>
    points.length === 1
      ? W / 2
      : padX + (i / (points.length - 1)) * (W - padX * 2);
  const y = (v: number) =>
    padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${x(points.length - 1).toFixed(1)} ${(H - padBottom).toFixed(
          1,
        )} L ${x(0).toFixed(1)} ${(H - padBottom).toFixed(1)} Z`
      : "";

  const last = points[points.length - 1];
  const gid = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* línea de meta */}
      {goal != null && (
        <>
          <line
            x1={padX}
            x2={W - padX}
            y1={y(goal)}
            y2={y(goal)}
            stroke="var(--color-muted)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <text
            x={W - padX}
            y={y(goal) - 4}
            textAnchor="end"
            fontSize="9"
            fill="var(--color-muted)"
          >
            meta {Math.round(goal)}
            {unit}
          </text>
        </>
      )}

      {areaPath && <path d={areaPath} fill={`url(#${gid})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* puntos */}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3.5 : 2} fill={color} />
      ))}

      {/* valor del último punto */}
      <text
        x={x(points.length - 1)}
        y={y(last.value) - 8}
        textAnchor="end"
        fontSize="11"
        fontWeight="600"
        fill="var(--color-text)"
      >
        {Math.round(last.value)}
        {unit}
      </text>

      {/* etiquetas extremas en X */}
      <text x={padX} y={H - 6} fontSize="9" fill="var(--color-muted)">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text
          x={W - padX}
          y={H - 6}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-muted)"
        >
          {last.label}
        </text>
      )}
    </svg>
  );
}
