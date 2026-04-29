import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Coins, Search, AlertCircle, ArrowLeft, MessageSquare, Lock } from "lucide-react";
import { Chat } from "@/components/Chat";
import { CreditsContext } from "@/contexts/CreditsContext";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Index,
});

const MIN_CREDITS_TO_START = 5;
const INITIAL_CREDITS = 10;
const CONTACT_COST = 5;

function Index() {
  const [credits, setCredits] = useState<number>(INITIAL_CREDITS);
  const [chatUnlocked, setChatUnlocked] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const handleStart = () => {
    if (credits >= MIN_CREDITS_TO_START) {
      setGateError(null);
      setChatUnlocked(true);
    } else {
      setGateError(
        `Necesitas al menos ${MIN_CREDITS_TO_START} créditos para iniciar la búsqueda de un proveedor.`,
      );
    }
  };

  const contactProvider = useCallback(
    (providerName: string) => {
      // Validate against the current credits snapshot. Using a functional
      // updater for validation is unsafe under React Strict Mode because the
      // updater runs twice in development, which can flip a local flag.
      if (credits < CONTACT_COST) {
        return {
          ok: false,
          reason: "No tienes créditos suficientes para iniciar el chat con este proveedor.",
        };
      }
      // Deduct exactly once based on the validated snapshot.
      setCredits(credits - CONTACT_COST);
      setActiveProvider(providerName);
      return { ok: true };
    },
    [credits],
  );

  return (
    <CreditsContext.Provider value={{ credits, contactCost: CONTACT_COST, contactProvider }}>
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-3">
          <button 
            onClick={() => {
              setActiveProvider(null);
              setChatUnlocked(false);
            }}
            className="flex flex-1 items-center gap-2.5 text-left transition-opacity hover:opacity-80"
            aria-label="Ir al inicio"
          >
            <img
              src={logo}
              alt="ServiApp"
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-[var(--shadow-elegant)]"
            />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              ServiApp
            </h1>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCredits(prev => prev + 5)}
              className="text-[10px] font-bold text-muted-foreground opacity-30 hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded border border-border/50 hover:bg-secondary"
              title="Dev: Añadir 5 créditos"
            >
              +5
            </button>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground"
              aria-label={`${credits} créditos disponibles`}
            >
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span>{credits} créditos</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-0 sm:px-4">
        {activeProvider ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
              <button
                onClick={() => {
                  setActiveProvider(null);
                  if (credits < MIN_CREDITS_TO_START) {
                    setChatUnlocked(false);
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  {activeProvider}
                </p>
                <p className="text-xs text-muted-foreground">Proveedor</p>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">
                Chat iniciado con {activeProvider}
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                Por ahora, este chat se muestra solo como demostración.
              </p>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-4">
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                <span>El envío de mensajes estará disponible próximamente.</span>
              </div>
            </div>
          </div>
        ) : chatUnlocked ? (
          <div className="flex flex-1 flex-col">
            <Chat />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="h-9 w-9" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-foreground">
              Encuentra ayuda para tu hogar
            </h2>
            <p className="mb-8 max-w-sm text-base leading-relaxed text-muted-foreground">
              Inicia la búsqueda y te conectaremos con el proveedor adecuado.
            </p>
            <button
              onClick={handleStart}
              className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[image:var(--gradient-primary)] px-6 text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90"
            >
              <Search className="h-5 w-5" />
              Buscar proveedor
            </button>
            <p className="mt-4 text-xs text-muted-foreground">
              Requiere al menos {MIN_CREDITS_TO_START} créditos disponibles.
            </p>
            {gateError && (
              <div className="mt-6 flex w-full max-w-sm items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{gateError}</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </CreditsContext.Provider>
  );
}
