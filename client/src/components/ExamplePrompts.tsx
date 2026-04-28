import { Lightbulb, AlertTriangle, HelpCircle, CheckCircle2 } from "lucide-react";

const EXAMPLES = [
  {
    text: "Mi casa huele mucho a gas",
    label: "Emergencia",
    icon: AlertTriangle,
    tone: "destructive" as const,
  },
  {
    text: "Algo se descompuso en el baño",
    label: "Caso ambiguo · seguimiento",
    icon: HelpCircle,
    tone: "warning" as const,
  },
  {
    text: "El aire acondicionado ya no enfría desde ayer",
    label: "Recomendación lista",
    icon: CheckCircle2,
    tone: "success" as const,
  },
  {
    text: "Hay agua saliendo por el fregadero de la cocina",
    label: "Recomendación lista",
    icon: CheckCircle2,
    tone: "success" as const,
  },
];

const toneStyles: Record<"destructive" | "warning" | "success", string> = {
  destructive: "text-destructive",
  warning: "text-warning-foreground",
  success: "text-success",
};

export function ExamplePrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-[image:var(--gradient-subtle)] p-4 sm:p-6">
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Prueba el pipeline completo</h3>
          <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
            Cada ejemplo dispara una rama distinta del flujo
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLES.map((ex) => {
          const Icon = ex.icon;
          return (
            <button
              key={ex.text}
              onClick={() => onPick(ex.text)}
              className="group min-h-[64px] rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-[var(--shadow-card)] active:scale-[0.99] sm:px-4 sm:py-3"
            >
              <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${toneStyles[ex.tone]}`}>
                <Icon className="h-3 w-3" />
                {ex.label}
              </div>
              <p className="text-sm leading-snug text-card-foreground">{ex.text}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
