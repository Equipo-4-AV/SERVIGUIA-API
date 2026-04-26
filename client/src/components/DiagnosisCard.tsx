import type { DiagnosisBlock, EmergencyAnalysis } from "@/types";
import { Stethoscope } from "lucide-react";

interface Props {
  diagnosis: DiagnosisBlock;
  emergency: EmergencyAnalysis;
}

export function DiagnosisCard({ diagnosis }: Props) {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-2.5">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-card-foreground">{diagnosis.resumen}</p>
      </div>
    </div>
  );
}
