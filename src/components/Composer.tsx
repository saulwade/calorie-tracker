"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, MicIcon, SendIcon, CloseIcon } from "./icons";

export type ComposerPayload = {
  text?: string;
  images?: { base64: string; mediaType: string }[];
  source: "text" | "photo" | "voice";
};

const MAX_PHOTOS = 4;

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
  const [photos, setPhotos] = useState<
    { preview: string; base64: string; mediaType: string }[]
  >([]);
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
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    const added = await Promise.all(
      files.slice(0, room).map(async (file) => {
        const { base64, mediaType } = await fileToCompressedBase64(file);
        return { preview: URL.createObjectURL(file), base64, mediaType };
      }),
    );
    setPhotos((prev) => [...prev, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    if (listening) stopVoice();
    if (!text.trim() && photos.length === 0) return;
    const source = photos.length ? "photo" : usedVoice ? "voice" : "text";
    onSubmit({
      text: text.trim() || undefined,
      images: photos.map((p) => ({ base64: p.base64, mediaType: p.mediaType })),
      source,
    });
    setText("");
    setPhotos([]);
    setUsedVoice(false);
    baseRef.current = "";
    lastTextRef.current = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  const canSend = Boolean(text.trim() || photos.length);

  return (
    <div className="mx-auto max-w-md px-3">
      {photos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {photos.map((ph, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ph.preview}
                alt={`comida ${i + 1}`}
                className="h-16 w-16 rounded-xl object-cover"
              />
              <button
                onClick={() =>
                  setPhotos((prev) => prev.filter((_, j) => j !== i))
                }
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-text)] text-white"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileRef.current?.click()}
              className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]"
              aria-label="Agregar otra foto"
            >
              <CameraIcon size={20} />
            </button>
          )}
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
          multiple
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
          className="autosize max-h-[120px] flex-1 resize-none self-center bg-transparent px-1 py-2 text-[15px] leading-snug outline-none placeholder:text-[var(--color-muted)]"
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
