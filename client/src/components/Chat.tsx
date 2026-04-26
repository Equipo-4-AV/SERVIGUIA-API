import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, Trash2, X, AlertCircle, MessageCircle } from "lucide-react";
import type { ChatMessage, DiagnosisResponse, IntegrationDebugPayload } from "@/types";
import { historyFromMessages, requestDiagnosis } from "@/api";
import { MessageBubble } from "./MessageBubble";
import { ProcessingStatus, type ProcessingStage } from "./ProcessingStatus";

interface Props {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onDiagnosis: (data: DiagnosisResponse, source: "api" | "mock") => void;
  onDebug?: (debug: IntegrationDebugPayload | null) => void;
}

export function Chat({ messages, setMessages, onDiagnosis, onDebug }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stage, setStage] = useState<ProcessingStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Persist the conversation id across turns so clarification replies stay
  // in the same task on the real backend. In mock mode this is just a
  // stable local placeholder and has no network effect.
  const taskIdRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stage]);

  // Cancel any in-flight request when the chat unmounts to prevent
  // duplicate polling loops or state updates on stale data.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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

    // Replace any previous in-flight request so we never run two polling
    // loops at once (e.g. user sends a second message quickly).
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      onDebug?.(null);
      const { data, source, taskId } = await requestDiagnosis(
        {
          text: messageText,
          image: sentImage,
          history: historyFromMessages(newMessages),
        },
        { taskId: taskIdRef.current ?? undefined, signal: controller.signal },
      );

      // Remember the task id for follow-up turns (clarification flow).
      // Once the conversation reaches a final result (emergency or ready
      // recommendation) we close the task so the next user message starts
      // a fresh one. We keep it open while clarification is needed.
      if (data.status === "needs_input") {
        taskIdRef.current = taskId;
      } else {
        taskIdRef.current = null;
      }

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
      if (e instanceof DOMException && e.name === "AbortError") {
        // Cancelled by a newer request — silently drop.
        return;
      }
      if (e instanceof Error && "payload" in e) {
        onDebug?.(e.payload as IntegrationDebugPayload);
      }
      // Friendly, non-technical message — never expose raw status codes.
      setError(
        "No pudimos completar tu solicitud. Por favor intenta de nuevo en un momento.",
      );
      // Reset the conversation so the next attempt starts fresh.
      taskIdRef.current = null;
    } finally {
      stageTimers.forEach(clearTimeout);
      setStage(null);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
    taskIdRef.current = null;
    abortRef.current?.abort();
  };

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col">
      <div
        ref={scrollRef}
        className="hide-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Cuéntanos qué problema tienes en casa
            </h2>
            <p className="max-w-xs text-base leading-relaxed text-muted-foreground">
              Escribe tu problema o adjunta una foto.
            </p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {stage && <ProcessingStatus stage={stage} />}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-4">
        {messages.length > 0 && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar conversación
            </button>
          </div>
        )}
        {imagePreview && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary p-2">
            <img src={imagePreview} alt="Vista previa" className="h-12 w-12 rounded-lg object-cover" />
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
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
            aria-label="Adjuntar imagen"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Escribe tu mensaje…"
            className="hide-scrollbar min-h-[48px] max-h-32 flex-1 resize-none bg-transparent px-1 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
            disabled={!!stage}
          />
          <button
            onClick={() => send()}
            disabled={!!stage || !text.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
