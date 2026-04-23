import { Info } from "lucide-react";

export function InputGuide() {
  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <p>
        <span className="font-semibold text-foreground">Tip:</span> describe{" "}
        <span className="text-foreground">qué falla, dónde y desde cuándo</span>. Si hay olor,
        sonido o agua visible, menciónalo. Puedes adjuntar una foto.
      </p>
    </div>
  );
}
