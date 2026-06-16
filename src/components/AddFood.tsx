"use client";

import { useEffect, useRef, useState } from "react";
import { localDay } from "@/lib/dates";

type Source = "text" | "photo" | "voice";

/** Reduce la imagen a máx 1024px y devuelve {base64, mediaType}. */
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
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1], mediaType: "image/jpeg" };
}

export default function AddFood({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{
    preview: string;
    base64: string;
    mediaType: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      const rec = new SR();
      rec.lang = "es-MX";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let transcript = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setText((prev) => {
          // reemplaza desde el inicio del dictado actual
          return (rec._base ? rec._base + " " : "") + transcript;
        });
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  function toggleVoice() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      rec._base = text;
      rec.start();
      setListening(true);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const { base64, mediaType } = await fileToCompressedBase64(file);
      setPhoto({ preview: URL.createObjectURL(file), base64, mediaType });
    } catch {
      setError("No pude leer la imagen.");
    }
  }

  async function submit() {
    if (!text.trim() && !photo) {
      setError("Escribe algo o toma una foto.");
      return;
    }
    setLoading(true);
    setError("");

    const source: Source = photo ? "photo" : listening ? "voice" : "text";

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: photo?.base64,
          mediaType: photo?.mediaType,
          source,
          day: localDay(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setText("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {photo && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.preview}
            alt="comida"
            className="h-24 w-24 rounded-xl object-cover"
          />
          <button
            onClick={() => setPhoto(null)}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-black/80 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder='¿Qué comiste? Ej: "2 tacos al pastor y un agua de jamaica"'
        className="w-full resize-none bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-[var(--color-muted)]"
      />

      {error && (
        <p className="px-1 pb-1 text-sm text-[var(--color-danger)]">{error}</p>
      )}

      <div className="mt-1 flex items-center gap-2">
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
          className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-lg active:scale-95"
          title="Tomar/subir foto"
        >
          📷
        </button>

        {voiceSupported && (
          <button
            onClick={toggleVoice}
            className={`grid h-10 w-10 place-items-center rounded-xl border text-lg active:scale-95 ${
              listening
                ? "border-[var(--color-danger)] bg-[var(--color-danger)]/20"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
            }`}
            title="Dictar por voz"
          >
            {listening ? "⏺️" : "🎤"}
          </button>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="ml-auto flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 font-medium text-black transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Analizando…
            </>
          ) : (
            "Registrar"
          )}
        </button>
      </div>
    </div>
  );
}
