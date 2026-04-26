import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { DiagnosisResponse, IntegrationDebugPayload } from "@/types";

interface Props {
  data: DiagnosisResponse | null;
  debug?: IntegrationDebugPayload | null;
}

const enabled = import.meta.env.VITE_SHOW_DEV_JSON === "true";

export function DevJsonButton({ data, debug }: Props) {
  const [copied, setCopied] = useState(false);

  if (!enabled) return null;

  const onCopy = () => {
    const json = data || debug
      ? JSON.stringify({ data, debug }, null, 2)
      : "// Sin salida disponible aún";
    navigator.clipboard.writeText(json).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!data && !debug}
      title="Copiar JSON (dev)"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "Copiado" : "JSON"}</span>
    </button>
  );
}