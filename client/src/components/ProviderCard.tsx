import { Star, Clock, BadgeCheck, MessageSquare, AlertCircle } from "lucide-react";
import type { Provider } from "@/types";
import { useState } from "react";
import { useCredits } from "@/contexts/CreditsContext";

export function ProviderCard({ provider }: { provider: Provider }) {
  const { credits, contactCost, contactProvider } = useCredits();
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const insufficient = credits < contactCost;

  const handleContact = () => {
    if (pending) return;
    setPending(true);
    setErrorMsg(null);
    const res = contactProvider(provider.nombre);
    if (!res.ok) {
      setErrorMsg(res.reason ?? "No se pudo iniciar el chat.");
      setPending(false);
    }
    // On success the parent unmounts this view (navigates to provider chat),
    // so no further state updates are needed here.
  };

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-card-foreground">
              {provider.nombre}
            </h4>
            <span className="text-xs text-muted-foreground">#{provider.id}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{provider.categoria}</p>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="text-xs font-semibold text-secondary-foreground">
            {provider.rating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {provider.badges.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            <BadgeCheck className="h-3 w-3" />
            {b}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="font-semibold text-foreground">{provider.rango_precio}</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {provider.disponibilidad}
        </span>
      </div>

      <button
        onClick={handleContact}
        disabled={insufficient || pending}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MessageSquare className="h-4 w-4" />
        Iniciar chat ({contactCost} créditos)
      </button>
      {errorMsg && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}