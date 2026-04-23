import type { DiagnosisBlock, EmergencyAnalysis } from "@/types";
import { UrgencyBadge } from "./UrgencyBadge";
import { Stethoscope, Gauge } from "lucide-react";

interface Props {
  diagnosis: DiagnosisBlock;
  emergency: EmergencyAnalysis;
}

export function DiagnosisCard({ diagnosis, emergency }: Props) {
  const confianzaPct = Math.round(diagnosis.confianza * 100);
  return (
    <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <UrgencyBadge level={emergency.nivel_urgencia} />
        {diagnosis.categoria && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {diagnosis.categoria}
          </span>
        )}
        {diagnosis.subcategoria && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {diagnosis.subcategoria}
          </span>
        )}
      </div>

      <div className="flex items-start gap-2">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-card-foreground">{diagnosis.resumen}</p>
      </div>

      {emergency.accion_inmediata && !emergency.is_emergency && (
        <p className="mt-3 rounded-lg bg-warning/10 p-3 text-xs text-foreground">
          <span className="font-semibold">Acción sugerida: </span>
          {emergency.accion_inmediata}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Gauge className="h-3.5 w-3.5" />
        <span>Confianza de clasificación</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-[image:var(--gradient-primary)]"
            style={{ width: `${confianzaPct}%` }}
          />
        </div>
        <span className="font-mono font-semibold text-foreground">{confianzaPct}%</span>
      </div>
    </div>
  );
}
