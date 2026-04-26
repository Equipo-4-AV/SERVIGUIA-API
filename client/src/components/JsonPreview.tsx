import { useState } from "react";
import { Code2, Copy, Check, ChevronDown } from "lucide-react";
import type { DiagnosisResponse } from "@/types";

interface Props {
  data: DiagnosisResponse | null;
  source?: "api" | "mock" | null;
}

export function JsonPreview({ data, source }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const json = data
    ? JSON.stringify(data, null, 2)
    : "// Aún no hay salida del módulo. Envía un mensaje para iniciar el pipeline.";

  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full max-h-[60vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:max-h-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-left lg:cursor-default lg:px-4 lg:py-3"
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <Code2 className="h-4 w-4 shrink-0 text-primary" />
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
        <div className="flex shrink-0 items-center gap-1">
          {data && (
            <span
              role="button"
              tabIndex={0}
              onClick={onCopy}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onCopy(e as unknown as React.MouseEvent);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform lg:hidden ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      <pre
        className={`flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-foreground sm:p-4 sm:text-xs ${
          open ? "block" : "hidden"
        } lg:block`}
      >
        {json}
      </pre>
    </div>
  );
}
