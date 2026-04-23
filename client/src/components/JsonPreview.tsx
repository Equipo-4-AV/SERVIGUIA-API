import { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import type { DiagnosisResponse } from "@/types";

interface Props {
  data: DiagnosisResponse | null;
  source?: "api" | "mock" | null;
}

export function JsonPreview({ data, source }: Props) {
  const [copied, setCopied] = useState(false);
  const json = data
    ? JSON.stringify(data, null, 2)
    : "// Aún no hay salida del módulo. Envía un mensaje para iniciar el pipeline.";

  const onCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Salida del módulo</h3>
          {data && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
              {data.stage}
            </span>
          )}
          {source && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                source === "api"
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning-foreground"
              }`}
            >
              {source === "api" ? "API" : "Mock"}
            </span>
          )}
        </div>
        <button
          onClick={onCopy}
          disabled={!data}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground">
        {json}
      </pre>
    </div>
  );
}
