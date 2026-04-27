import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, Trash2, X, AlertCircle, MessageCircle } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ProcessingStatus } from "./ProcessingStatus";
import { useAgentChat } from "@/hooks/useAgentChat";

const mapPrice = (priceStr: string) => {
  const mapping: Record<string, string> = {
    "$": "Económico · $",
    "$$": "Precio medio · $$",
    "$$$": "Costoso · $$$",
    "$$$$": "Premium · $$$$"
  };
  return mapping[priceStr] || priceStr;
};

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(rating);
  
  return (
    <span className="text-yellow-400 font-medium">
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
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    providers,
    currentResult,
    isProcessing,
    error,
    sendMessage,
    clearChat
  } = useAgentChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isProcessing, providers]);

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

    sendMessage(messageText, image);
    setText("");
    setImage(null);
    setImagePreview(null);
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
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
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
            messages.map((m) => (
              <MessageBubble 
                key={m.id} 
                message={m} 
                onImageClick={setSelectedImage} 
              />
            ))
          )}

          {/* Proveedores */}
          {providers.length > 0 && (
            <div className="flex flex-col gap-3 mt-6 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-px flex-1 bg-border" />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Proveedores Recomendados
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              {providers.map((p) => {
                // Calcular intersección para mostrar solo subcategorías relevantes (chips)
                const problemSubs = currentResult?.subcategorias?.map(s => s.toLowerCase().trim()) || [];
                const matchingSubs = p.subcategories.filter(sub => 
                  problemSubs.includes(sub.toLowerCase().trim())
                );

                return (
                  <div key={p.id} className="border border-border p-4 rounded-2xl shadow-sm bg-card transition-shadow hover:shadow-md flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <h4 className="font-bold text-base sm:text-lg text-foreground truncate">{p.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{p.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-foreground mb-1">{mapPrice(p.price_evaluation)}</div>
                        <div className="flex justify-end">{renderStars(p.rating)}</div>
                      </div>
                    </div>
                    
                    {matchingSubs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {matchingSubs.map(sub => (
                          <span 
                            key={sub} 
                            className="px-2.5 py-1 bg-secondary text-secondary-foreground text-[11px] sm:text-xs font-medium rounded-md border border-border/50 capitalize"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isProcessing && <ProcessingStatus stage="classification" />}

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
                onClick={clearChat}
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
              disabled={isProcessing}
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
              disabled={isProcessing}
            />
            <button
              onClick={() => send()}
              disabled={isProcessing || !text.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
