import type { RecommendationBlock } from "@/types";
import { ProviderCard } from "./ProviderCard";
import { Lock, Sparkles } from "lucide-react";

export function RecommendationSection({ recommendation }: { recommendation: RecommendationBlock }) {
  if (!recommendation.ready) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Recomendaciones aún no disponibles
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {recommendation.motivo_no_listo ??
                "El motor de recomendación se ejecutará cuando se complete la clasificación."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mejores coincidencias
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {recommendation.proveedores.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </div>
  );
}
