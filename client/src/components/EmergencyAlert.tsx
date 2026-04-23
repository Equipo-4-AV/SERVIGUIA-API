import { AlertTriangle, Phone } from "lucide-react";
import type { EmergencyAnalysis } from "@/types";

export function EmergencyCard({ data }: { data: EmergencyAnalysis }) {
  return (
    <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-5 shadow-[0_8px_24px_-8px_var(--destructive)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-destructive">
            Emergencia detectada
          </h3>
          {data.motivo && (
            <p className="mt-1 text-xs font-medium text-destructive/80">{data.motivo}</p>
          )}
          {data.accion_inmediata && (
            <p className="mt-2 text-sm leading-relaxed text-foreground">{data.accion_inmediata}</p>
          )}
          {data.numero_emergencia && (
            <a
              href={`tel:${data.numero_emergencia}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
            >
              <Phone className="h-4 w-4" />
              Llamar al {data.numero_emergencia}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Backwards-compat alias
export const EmergencyAlert = EmergencyCard;
