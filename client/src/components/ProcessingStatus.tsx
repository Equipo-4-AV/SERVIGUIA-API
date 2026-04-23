import { Loader2 } from "lucide-react";

export type ProcessingStage =
  | "emergency"
  | "classification"
  | "follow_up"
  | "matching"
  | "done";

const LABELS: Record<ProcessingStage, string> = {
  emergency: "Analizando emergencia…",
  classification: "Clasificando necesidad…",
  follow_up: "Esperando más información…",
  matching: "Calculando mejores coincidencias…",
  done: "Resultado listo",
};

export function ProcessingStatus({ stage }: { stage: ProcessingStage }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[image:var(--gradient-primary)]">
        <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
      </div>
      <span>{LABELS[stage]}</span>
    </div>
  );
}
