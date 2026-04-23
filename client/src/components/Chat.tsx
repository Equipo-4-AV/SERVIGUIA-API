import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, Trash2, X, AlertCircle } from "lucide-react";
import type { ChatMessage, DiagnosisResponse } from "@/types";
import { historyFromMessages, requestDiagnosis } from "@/services/api";
import { MessageBubble } from "./MessageBubble";
import { ExamplePrompts } from "./ExamplePrompts";
import { InputGuide } from "./InputGuide";
import { ProcessingStatus, type ProcessingStage } from "./ProcessingStatus";

interface Props {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onDiagnosis: (data: DiagnosisResponse, source: "api" | "mock") => void;
}

export function Chat({ messages, setMessages, onDiagnosis }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stage, setStage] = useState<ProcessingStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stage]);

  const handleFile = (f: File | null) => {
    setImage(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setImagePreview(null);
    }
  };

  const send = async (overrideText?: string) => {
    const messageText = (overrideText ?? text).trim();
    if (!messageText || stage) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: messageText,
      imageUrl: imagePreview ?? undefined,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setText("");
    const sentImage = image;
    handleFile(null);
    if (fileRef.current) fileRef.current.value = "";

    // Animated pipeline stages
    setStage("emergency");
    const stagesTimeline: ProcessingStage[] = ["classification", "matching"];
    const stageTimers: ReturnType<typeof setTimeout>[] = [];
    stagesTimeline.forEach((s, i) => {
      stageTimers.push(setTimeout(() => setStage(s), 600 * (i + 1)));
    });

    try {
      const { data, source } = await requestDiagnosis({
        text: messageText,
        image: sentImage,
        history: historyFromMessages(newMessages),
      });

      // If pipeline indicates follow-up, reflect it briefly
      if (data.status === "needs_input") setStage("follow_up");
      else if (data.emergency_analysis.is_emergency) setStage("emergency");
      else setStage("done");

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.diagnosis?.resumen ?? data.emergency_analysis.motivo ?? "Resultado listo",
        diagnosis: data,
        timestamp: Date.now(),
      };
      // small pause so user perceives the final stage label
      await new Promise((r) => setTimeout(r, 250));
      setMessages((prev) => [...prev, assistantMsg]);
      onDiagnosis(data, source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      stageTimers.forEach(clearTimeout);
      setStage(null);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Asistente ServiGuía</h2>
          <p className="text-xs text-muted-foreground">
            Pipeline: emergencia → clasificación → seguimiento → recomendación
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <ExamplePrompts onPick={(t) => send(t)} />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {stage && <ProcessingStatus stage={stage} />}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <InputGuide />
        {imagePreview && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary p-2">
            <img src={imagePreview} alt="Vista previa" className="h-12 w-12 rounded object-cover" />
            <button
              onClick={() => {
                handleFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label="Quitar imagen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Describe qué falla, dónde y desde cuándo…"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            disabled={!!stage}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!stage}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
            aria-label="Adjuntar imagen"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => send()}
            disabled={!!stage || !text.trim()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[image:var(--gradient-primary)] px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
