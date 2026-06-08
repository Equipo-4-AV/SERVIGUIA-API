import { useEffect, useRef, useState, useContext } from "react";
import {
  Image as ImageIcon,
  Send,
  Trash2,
  X,
  AlertCircle,
  MessageCircle,
  MessageSquare,
  Mic,
  Square,
  RotateCcw,
  Play,
  SendHorizonal,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ProcessingStatus } from "./ProcessingStatus";
import { useAgentChat } from "@/hooks/useAgentChat";
import type { BackendProvider, ChatMessage } from "@/types";
import { CreditsContext, type CreditsContextValue } from "@/contexts/CreditsContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Web Speech API type augmentation for browsers that only expose webkit-prefixed version
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const mapPrice = (priceStr: string) => {
  const mapping: Record<string, string> = {
    $: "Económico · $",
    $$: "Precio medio · $$",
    $$$: "Costoso · $$$",
    $$$$: "Premium · $$$$",
  };
  return mapping[priceStr] || priceStr;
};

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(rating);

  return (
    <span className="whitespace-nowrap text-yellow-400 font-medium">
      {"★".repeat(fullStars)}
      {hasHalf ? "½" : ""}
      {"☆".repeat(Math.max(0, emptyStars))}
      <span className="ml-1.5 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
    </span>
  );
};

export function Chat() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedProviderForChat, setSelectedProviderForChat] = useState<BackendProvider | null>(
    null,
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [showNoCreditsAlert, setShowNoCreditsAlert] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Countdown seconds remaining (max 45s) shown in the status bar
  const [recordingTimeLeft, setRecordingTimeLeft] = useState<number | null>(null);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Persistent ref so onend/onerror can always reach the current instance (RF-STT-02)
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Accumulates all confirmed (final) segments across multiple onresult events
  const finalTranscriptRef = useRef<string>("");
  // Timer refs for the 45-second auto-stop and the per-second countdown
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoRestartingRef = useRef(false);

  const creditsCtx = useContext(CreditsContext);

  const { messages, currentResult, isProcessing, error, sendMessage, clearChat } = useAgentChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    // Keep hint visible while recording or transcribing; auto-dismiss otherwise
    if (!voiceHint || isVoiceActive || isTranscribing) return;

    const timer = window.setTimeout(() => setVoiceHint(null), 4000);
    return () => window.clearTimeout(timer);
  }, [voiceHint, isVoiceActive, isTranscribing]);

  // Auto-scroll textarea to bottom when text overflows during voice dictation
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text]);

  // Cleanup recognition and timers on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try { recognitionRef.current.abort(); } catch { /* already stopped */ }
      }
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleConfirmChat = () => {
    if (!selectedProviderForChat || !creditsCtx) return;

    const result = creditsCtx.contactProvider(selectedProviderForChat.name);
    if (!result.ok) {
      setModalError(result.reason || "Error desconocido");
      return;
    }

    setSelectedProviderForChat(null);
    setModalError(null);
  };

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

  const send = () => {
    const messageText = text.trim();
    if (!messageText || isProcessing) return;

    setIsVoiceActive(false);
    setVoiceHint(null);
    sendMessage(messageText, image);
    setText("");
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleVoiceRecording = () => {
    if (isProcessing) return;

    if (isVoiceActive) {
      recognitionRef.current?.stop();
      return;
    }

    // Check browser support
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceHint(
        "Tu navegador no soporta reconocimiento de voz. Por favor escribe tu mensaje.",
      );
      return;
    }

    // ── Helper: clear the 45s auto-stop + 1s countdown timers ──
    const clearTimers = () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setRecordingTimeLeft(null);
    };

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-ES";         // [RF-STT-05] Spanish
    recognition.continuous = true;      // keep listening up to 45 s
    recognition.interimResults = true;  // semi-real-time transcription

    recognition.onstart = () => {
      setIsVoiceActive(true);
      setIsTranscribing(false);
      setIsPaused(false);
      setVoiceHint(null);
      if (!isPaused && !isAutoRestartingRef.current) {
        setText("");
        finalTranscriptRef.current = "";
      }

      if (!isAutoRestartingRef.current) {
        setRecordingTimeLeft(45);

        countdownIntervalRef.current = setInterval(() => {
          setRecordingTimeLeft((prev) => {
            if (prev === null || prev <= 1) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        autoStopTimerRef.current = setTimeout(() => {
          isAutoRestartingRef.current = false;
          recognitionRef.current?.stop();
        }, 45_000);
      }
      
      isAutoRestartingRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += segment + " ";
        } else {
          interimTranscript += segment;
        }
      }

      setText((finalTranscriptRef.current + interimTranscript).trimStart());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[STT] error:", event.error);
      
      if (event.error === "no-speech") {
        isAutoRestartingRef.current = true;
        return;
      }

      clearTimers();
      setIsTranscribing(false);
      setIsVoiceActive(false);
      setIsPaused(false);
      setText("");
      finalTranscriptRef.current = "";

      if (event.error === "aborted") {
        setVoiceHint("Grabación cancelada.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceHint(
          "No se pudo acceder al micrófono. Verifica los permisos del navegador o escribe tu mensaje.",
        );
      } else {
        setVoiceHint("No pudimos procesar el audio. Intenta de nuevo o escribe tu mensaje.");
      }
    };

    recognition.onend = () => {
      if (isAutoRestartingRef.current) {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.error("[STT] Auto-restart failed", e);
          isAutoRestartingRef.current = false;
        }
        if (isAutoRestartingRef.current) return;
      }

      clearTimers();
      setIsVoiceActive(false);
      setIsTranscribing(false);

      const finalText = finalTranscriptRef.current.trim();
      setText(finalText);

      if (finalText) {
        setIsPaused(true);
        setVoiceHint("Grabación detenida. Revisa, continúa o envía tu mensaje.");
      } else {
        setIsPaused(false);
        finalTranscriptRef.current = "";
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[STT] Could not start recognition:", err);
      setVoiceHint("No se pudo iniciar el micrófono. Intenta de nuevo.");
    }
  };

  const cancelVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { /* already stopped */ }
    }
    finalTranscriptRef.current = "";
    setText("");
    setIsVoiceActive(false);
    setIsTranscribing(false);
    setIsPaused(false);
    setVoiceHint("Grabación cancelada.");
  };

  const redoRecording = () => {
    finalTranscriptRef.current = "";
    setText("");
    setIsPaused(false);
    setVoiceHint(null);
    toggleVoiceRecording();
  };

  const continueRecording = () => {
    setIsPaused(false);
    setVoiceHint(null);
    toggleVoiceRecording();
  };

  const sendVoiceMessage = () => {
    const messageText = text.trim();
    if (!messageText) return;
    sendMessage(messageText, image);
    setText("");
    setImage(null);
    setImagePreview(null);
    setIsPaused(false);
    setVoiceHint("✓ Mensaje de voz enviado.");
    finalTranscriptRef.current = "";
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      {/* Modal de visualización de imagen */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full flex flex-col items-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="mb-3 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Cerrar imagen"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Vista ampliada"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Modal de créditos insuficientes */}
      {showNoCreditsAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-5 text-center shadow-xl sm:p-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Créditos insuficientes</h3>
            <p className="text-sm text-muted-foreground mb-6">
              No tienes créditos suficientes para iniciar un nuevo chat.
            </p>
            <button
              onClick={() => setShowNoCreditsAlert(false)}
              className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90 transition-opacity"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de contacto */}
      {selectedProviderForChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
            <h3 className="text-xl font-bold mb-3 text-foreground">Confirmar contacto</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Vas a iniciar un chat con{" "}
              <span className="font-semibold text-foreground">{selectedProviderForChat.name}</span>.
              Se descontarán {creditsCtx?.contactCost || 5} créditos de tu saldo.
            </p>

            {modalError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedProviderForChat(null);
                  setModalError(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmChat}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90 transition-opacity"
              >
                <MessageSquare className="h-4 w-4" />
                Iniciar chat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100dvh-58px)] min-w-0 flex-col sm:h-[calc(100dvh-64px)]">
        <div
          ref={scrollRef}
          className="hide-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h2 className="mb-2 max-w-sm text-balance text-xl font-semibold text-foreground">
                Cuéntanos qué problema tienes en casa
              </h2>
              <p className="max-w-xs text-base leading-relaxed text-muted-foreground">
                Escribe tu problema, dicta el mensaje o adjunta una foto.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              if (m.type === "separator") {
                return (
                  <div key={m.id} className="flex items-center gap-4 py-4 opacity-70">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Nueva conversación
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                );
              }
              if (m.type === "providers") {
                return (
                  <ProvidersMessage
                    key={m.id}
                    message={m}
                    setShowNoCreditsAlert={setShowNoCreditsAlert}
                    setSelectedProviderForChat={setSelectedProviderForChat}
                    setModalError={setModalError}
                    creditsCtx={creditsCtx}
                  />
                );
              }
              return <MessageBubble key={m.id} message={m} onImageClick={setSelectedImage} />;
            })
          )}

          {isProcessing && <ProcessingStatus stage="classification" />}

          {error && (
            <div className="flex items-start gap-2 break-words rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/95 px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-4">
          {((messages.length > 0) && !isVoiceActive) && (
            <div className="mb-2 flex justify-start">
              <button
                onClick={clearChat}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpiar conversación
              </button>
            </div>
          )}
          {imagePreview && (
            <div className="mb-2 flex w-full max-w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary p-2 sm:inline-flex sm:w-auto">
              <img
                src={imagePreview}
                alt="Vista previa"
                className="h-12 w-12 rounded-lg object-cover"
              />
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
          {(voiceHint || isTranscribing || isVoiceActive || isPaused) && (
            <div
              className="mb-2 rounded-xl border border-border bg-secondary/50 px-3 py-2.5"
              aria-live="polite"
              role="status"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-medium">
                <div className="flex items-center gap-2">
                  {isVoiceActive ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                      </span>
                      <span className="text-destructive">
                        Escuchando…{recordingTimeLeft !== null ? ` ${recordingTimeLeft}s` : ""}
                      </span>
                      {recordingTimeLeft !== null && (
                        <span className="ml-1 text-muted-foreground/70">/ 45s</span>
                      )}
                    </>
                  ) : isTranscribing ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">Transcribiendo voz…</span>
                    </>
                  ) : isPaused ? (
                    <>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">Grabación pausada — revisa tu mensaje</span>
                    </>
                  ) : (
                    <>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          voiceHint?.startsWith("✓")
                            ? "bg-emerald-500"
                            : voiceHint?.includes("No") || voiceHint?.includes("pudo")
                              ? "bg-destructive"
                              : "bg-primary"
                        }`}
                      />
                      <span
                        className={`${
                          voiceHint?.startsWith("✓")
                            ? "text-emerald-600 dark:text-emerald-400"
                            : voiceHint?.includes("No") || voiceHint?.includes("pudo")
                              ? "text-destructive"
                              : "text-primary"
                        }`}
                      >
                        {voiceHint}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {(isVoiceActive || isPaused) && (
                <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
                  {isVoiceActive && (
                    <>
                      <button
                        onClick={() => recognitionRef.current?.stop()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
                      >
                        <Square className="h-3 w-3" />
                        Detener
                      </button>
                      <button
                        onClick={cancelVoiceRecording}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                    </>
                  )}

                  {isPaused && (
                    <>
                      <button
                        onClick={continueRecording}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/25 dark:text-emerald-400"
                      >
                        <Play className="h-3 w-3" />
                        Continuar
                      </button>
                      <button
                        onClick={redoRecording}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rehacer
                      </button>
                      <button
                        onClick={cancelVoiceRecording}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                      <button
                        onClick={sendVoiceMessage}
                        disabled={!text.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[image:var(--gradient-primary)] px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        <SendHorizonal className="h-3 w-3" />
                        Enviar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex min-w-0 items-end gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 sm:gap-2 sm:p-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isProcessing || isVoiceActive}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 sm:h-12 sm:w-12"
              aria-label="Adjuntar imagen"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { if (!isVoiceActive) setText(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={isVoiceActive ? "Escuchando tu voz…" : "Escribe o dicta tu mensaje..."}
              className={`hide-scrollbar max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground overflow-y-auto sm:py-3 ${
                isVoiceActive ? "text-destructive/80 cursor-default select-none" : "text-foreground"
              }`}
              disabled={isProcessing}
              readOnly={isVoiceActive}
            />
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleVoiceRecording}
                    disabled={isProcessing || isTranscribing || isPaused}
                    aria-label={isVoiceActive ? "Detener dictado" : "Dictar mensaje"}
                    aria-pressed={isVoiceActive}
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-40 sm:h-12 sm:w-12 ${
                      isVoiceActive
                        ? "bg-destructive/10 text-destructive ring-2 ring-destructive/40 scale-105"
                        : isTranscribing
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : isPaused
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {isVoiceActive && (
                      <span className="absolute h-8 w-8 animate-ping rounded-full bg-destructive/25" />
                    )}
                    <Mic className="relative h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isVoiceActive
                    ? "Clic para detener"
                    : isTranscribing
                      ? "Transcribiendo…"
                      : isPaused
                        ? "Grabación pausada"
                        : "Dictar mensaje (español)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              onClick={() => send()}
              disabled={isProcessing || !text.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:w-12"
              aria-label="Enviar"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ProvidersMessage({
  message,
  setShowNoCreditsAlert,
  setSelectedProviderForChat,
  setModalError,
  creditsCtx,
}: {
  message: ChatMessage;
  setShowNoCreditsAlert: (v: boolean) => void;
  setSelectedProviderForChat: (p: BackendProvider) => void;
  setModalError: (v: string | null) => void;
  creditsCtx: CreditsContextValue | null;
}) {
  const [displayProviders, setDisplayProviders] = useState<BackendProvider[]>([]);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    if (!message.providers || message.providers.length === 0) {
      setDisplayProviders([]);
      return;
    }
    const reordered = [...message.providers];
    if (reordered.length > 1) {
      const top1 = reordered[0];
      const rest = reordered.slice(1);

      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }

      if (rest.length > 0) {
        setDisplayProviders([rest[0], top1, ...rest.slice(1)]);
      } else {
        setDisplayProviders([top1]);
      }
    } else {
      setDisplayProviders(reordered);
    }
  }, [message.providers]);

  if (!message.providers || message.providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mt-6 mb-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-border" />
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Proveedores Recomendados
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>

      {displayProviders.slice(0, visibleCount).map((p) => {
        const problemSubs = message.subcategories?.map((s) => s.toLowerCase().trim()) || [];
        const matchingSubs = p.subcategories.filter((sub) =>
          problemSubs.includes(sub.toLowerCase().trim()),
        );

        return (
          <div
            key={p.id}
            className="flex min-h-[116px] flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:gap-4"
          >
            {/* Columna Izquierda */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h4 className="break-words text-base font-bold text-foreground sm:truncate sm:text-lg">
                  {p.name}
                </h4>
                <p className="text-sm text-muted-foreground capitalize">{p.category}</p>
              </div>

              {/* Subcategorías */}
              <div className="flex flex-wrap gap-1.5 mt-3 min-h-[24px] content-end overflow-hidden">
                {matchingSubs.map((sub) => (
                  <span
                    key={sub}
                    className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[11px] font-medium rounded-md border border-border/50 capitalize whitespace-nowrap"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="flex w-full shrink-0 items-end justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
              <div className="text-left sm:text-right">
                <div className="text-sm font-medium text-foreground mb-1">
                  {mapPrice(p.price_evaluation)}
                </div>
                <div className="flex justify-end">{renderStars(p.rating)}</div>
              </div>

              <div className="mt-0 sm:mt-2">
                <button
                  onClick={() => {
                    if (creditsCtx && creditsCtx.credits < creditsCtx.contactCost) {
                      setShowNoCreditsAlert(true);
                    } else {
                      setModalError(null);
                      setSelectedProviderForChat(p);
                    }
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Iniciar chat
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {visibleCount < displayProviders.length && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setVisibleCount(displayProviders.length)}
            className="rounded-full bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 border border-border"
          >
            Ver más
          </button>
        </div>
      )}
    </div>
  );
}