import type { UrgencyLevel } from "@/types";
import { cn } from "@/lib/utils";

const styles: Record<UrgencyLevel, string> = {
  CRÍTICO: "bg-destructive text-destructive-foreground",
  MODERADO: "bg-warning text-warning-foreground",
  NORMAL: "bg-success text-success-foreground",
};

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        styles[level],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {level}
    </span>
  );
}