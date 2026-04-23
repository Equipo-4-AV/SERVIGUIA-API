import { Star, Clock, BadgeCheck } from "lucide-react";
import type { Provider } from "@/types";

export function ProviderCard({ provider }: { provider: Provider }) {
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
    </div>
  );
}