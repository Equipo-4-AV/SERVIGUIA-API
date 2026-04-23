import { HelpCircle } from "lucide-react";

export function FollowUpCard({ question }: { question: string }) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
          <HelpCircle className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wide text-warning-foreground/80">
            Necesitamos más información
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{question}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Responde abajo para continuar con la clasificación.
          </p>
        </div>
      </div>
    </div>
  );
}
