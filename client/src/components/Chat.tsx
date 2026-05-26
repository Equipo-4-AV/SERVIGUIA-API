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
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ProcessingStatus } from "./ProcessingStatus";
import { useAgentChat } from "@/hooks/useAgentChat";
import type { BackendProvider, ChatMessage } from "@/types";
import { CreditsContext, type CreditsContextValue } from "@/contexts/CreditsContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const VOICE_DEMO_TEXT = "Necesito reparar una fuga de agua en la cocina.";

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
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceTimerRef = useRef<number | null>(null);

  const creditsCtx = useContext(CreditsContext);

  const { messages, currentResult, isProcessing, error, sendMessage, clearChat } = useAgentChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) {
        window.clearTimeout(voiceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!voiceHint || isVoiceActive) return;

    const timer = window.setTimeout(() => setVoiceHint(null), 2400);
    return () => window.clearTimeout(timer);
  }, [voiceHint, isVoiceActive]);

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

    if (voiceTimerRef.current) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setIsVoiceActive(false);
    setVoiceHint(null);
    sendMessage(messageText, image);
    setText("");
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleVoiceDemo = () => {
    if (isProcessing) return;

    if (voiceTimerRef.current) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    if (isVoiceActive) {
      setIsVoiceActive(false);
      setVoiceHint("Dictado pausado.");
      return;
    }

    setIsVoiceActive(true);
    setVoiceHint("Escuchando...");
    voiceTimerRef.current = window.setTimeout(() => {
      setText((currentText) => {
        const trimmed = currentText.trim();
        if (!trimmed) return VOICE_DEMO_TEXT;
        if (currentText.includes(VOICE_DEMO_TEXT)) return currentText;
        return `${currentText.trimEnd()} ${VOICE_DEMO_TEXT}`;
      });
      setIsVoiceActive(false);
      setVoiceHint("Texto dictado listo para enviar.");
      voiceTimerRef.current = null;
    }, 1100);
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
          {messages.length > 0 && (
            <div className="mb-2 flex justify-end">
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
          {voiceHint && (
            <div
              className="mb-2 flex items-center gap-2 px-2 text-xs font-medium text-primary"
              aria-live="polite"
            >
              <span
                className={`h-2 w-2 rounded-full ${isVoiceActive ? "animate-pulse bg-primary" : "bg-success"}`}
              />
              <span>{voiceHint}</span>
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
              disabled={isProcessing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 sm:h-12 sm:w-12"
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
              placeholder="Escribe o dicta tu mensaje..."
              className="hide-scrollbar min-h-[44px] max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground sm:min-h-[48px] sm:py-3"
              disabled={isProcessing}
            />
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleVoiceDemo}
                    disabled={isProcessing}
                    aria-label={isVoiceActive ? "Pausar dictado" : "Dictar mensaje"}
                    aria-pressed={isVoiceActive}
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 sm:h-12 sm:w-12 ${
                      isVoiceActive
                        ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {isVoiceActive && (
                      <span className="absolute h-8 w-8 animate-ping rounded-full bg-primary/20" />
                    )}
                    <Mic className="relative h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isVoiceActive ? "Escuchando..." : "Dictar mensaje"}
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
