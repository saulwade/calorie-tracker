"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";

const LS_KEY = "pwa_hint_dismissed_v1";

/**
 * Ayuda para "Agregar a inicio" en iPhone. iOS NO permite un botón que instale
 * automáticamente (Apple lo bloquea), así que mostramos los pasos. Solo aparece
 * en iOS, fuera del modo app (standalone), y si no se ha descartado.
 */
export default function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    const dismissed = localStorage.getItem(LS_KEY) === "1";
    if (isIOS && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(LS_KEY, "1");
    setShow(false);
  }

  return (
    <div className="row-in mb-3 flex items-start gap-3 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-3.5 py-3">
      <span className="text-lg leading-none">📲</span>
      <div className="flex-1 text-[13px] leading-snug text-[var(--color-text)]">
        <span className="font-semibold">Agrégala a tu pantalla de inicio</span>{" "}
        para abrirla como app (sin barra del navegador): toca{" "}
        <span className="font-semibold">Compartir</span> (el cuadro con la
        flecha ↑) abajo en Safari y elige{" "}
        <span className="font-semibold">“Agregar a inicio”</span>.
      </div>
      <button
        onClick={dismiss}
        aria-label="Descartar"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition active:scale-90"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
