"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, MicIcon, SendIcon, CloseIcon } from "./icons";

export type ComposerPayload = {
  text?: string;
  imageBase64?: string;
  mediaType?: string;
  source: "text" | "photo" | "voice";
};

async function fileToCompressedBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const max = 1024;
  let { width, height } = img;
  if (width > max || height > max) {
    const scale = max / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1], mediaType: "image/jpeg" };
}

export default function Composer({
  onSubmit,
}: {
  onSubmit: (p: ComposerPayload) => void;
}) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{
    preview: string;
    base64: string;
    mediaType: string;
  } | null>(null);
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // refs para el dictado continuo
  const baseRef = useRef(""); // texto antes de la sesión de dictado
  const lastTextRef = useRef(""); // último texto mostrado (para no perderlo al reiniciar)
  const manualStopRef = useRef(false); // true = el usuario pidió parar

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setVoiceSupported(true);
    const rec = new SR();
    rec.lang = "es-MX";
    rec.continuous = true; // sigue escuchando hasta que el usuario pare
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) {
        s += e.results[i][0].transcript;
      }
      const combined = (baseRef.current ? baseRef.current + " " : "") + s;
      lastTextRef.current = combined;
      setText(combined);
    };

    rec.onend = () => {
      // Si el navegador lo cortó solo (silencio/límite) y el usuario NO pidió
      // parar, conservamos lo dicho y seguimos escuchando.
      if (!manualStopRef.current) {
        baseRef.current = lastTextRef.current;
        try {
          rec.start();
          return;
        } catch {
          /* si no se puede reiniciar, caemos a detener */
        }
      }
      setListening(false);
    };

    rec.onerror = (e: any) => {
      // "no-speech" / "aborted" son normales; solo detenemos en errores reales.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        manualStopRef.current = true;
        setListening(false);
      }
    };

    recRef.current = rec;
    return () => {
      manualStopRef.current = true;
      try {
        rec.stop();
      } catch {}
    };
  }, []);

  // auto-resize del textarea (crece con el contenido, máx ~120px)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [text]);

  function startVoice() {
    const rec = recRef.current;
    if (!rec) return;
    baseRef.current = text;
    lastTextRef.current = text;
    manualStopRef.current = false;
    try {
      rec.start();
      setListening(true);
      setUsedVoice(true);
    } catch {
      /* ya estaba activo */
    }
  }

  function stopVoice() {
    const rec = recRef.current;
    if (!rec) return;
    manualStopRef.current = true;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mediaType } = await fileToCompressedBase64(file);
    setPhoto({ preview: URL.createObjectURL(file), base64, mediaType });
  }

  function submit() {
    if (listening) stopVoice();
    if (!text.trim() && !photo) return;
    const source = photo ? "photo" : usedVoice ? "voice" : "text";
    onSubmit({
      text: text.trim() || undefined,
      imageBase64: photo?.base64,
      mediaType: photo?.mediaType,
      source,
    });
    setText("");
    setPhoto(null);
    setUsedVoice(false);
    baseRef.current = "";
    lastTextRef.current = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  const canSend = Boolean(text.trim() || photo);

  return (
    <div className="mx-auto max-w-md px-3">
      {photo && (
        <div className="mb-2 flex">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.preview}
              alt="comida"
              className="h-16 w-16 rounded-xl object-cover"
            />
            <button
              onClick={() => setPhoto(null)}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-text)] text-white"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {listening && (
        <div className="mb-2 flex items-center justify-center gap-2 text-[12px] text-[var(--color-danger)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-danger)]" />
          Escuchando… toca el micrófono para terminar
        </div>
      )}

      <div className="flex items-end gap-1.5 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 soft-shadow">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)]"
          aria-label="Foto"
        >
          <CameraIcon size={21} />
        </button>

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Describe lo que comes…"
          className="max-h-[120px] flex-1 resize-none self-center bg-transparent px-1 py-2 text-[15px] leading-snug outline-none placeholder:text-[var(--color-muted)]"
        />

        {/* Micrófono: SIEMPRE visible. Toca para empezar/terminar de dictar. */}
        {voiceSupported && (
          <button
            onClick={listening ? stopVoice : startVoice}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
              listening
                ? "animate-pulse bg-[var(--color-danger)] text-white"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
            }`}
            aria-label={listening ? "Terminar dictado" : "Dictar"}
          >
            <MicIcon size={21} />
          </button>
        )}

        <button
          onClick={submit}
          disabled={!canSend}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white transition active:scale-90 disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-muted)]"
          aria-label="Enviar"
        >
          <SendIcon size={19} />
        </button>
      </div>
    </div>
  );
}
