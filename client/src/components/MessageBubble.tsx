import type { ChatMessage } from "@/types";
import { Sparkles, User, AlertCircle } from "lucide-react";

export function MessageBubble({
  message,
  onImageClick,
}: {
  message: ChatMessage;
  onImageClick?: (url: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2 sm:gap-3">
        <div className="max-w-[86%] min-w-0 space-y-2 sm:max-w-[75%]">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Adjunto del usuario"
              onClick={() => onImageClick?.(message.imageUrl!)}
              className="ml-auto max-h-48 rounded-xl border border-border object-cover cursor-pointer transition-opacity hover:opacity-90"
            />
          )}
          <div className="break-words rounded-2xl rounded-tr-sm bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm text-primary-foreground shadow-[var(--shadow-elegant)]">
            {message.text}
          </div>
        </div>
        <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground sm:flex">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  const isEmergency = message.text?.includes("EMERGENCIA DETECTADA");

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div
        className={`mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full ${isEmergency ? "bg-destructive" : "bg-[image:var(--gradient-primary)]"} text-primary-foreground sm:flex`}
      >
        {isEmergency ? <AlertCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="w-full min-w-0 max-w-full space-y-3 sm:max-w-[85%]">
        <div
          className={`break-words rounded-2xl rounded-tl-sm border p-4 text-sm shadow-[var(--shadow-card)] ${isEmergency ? "border-destructive bg-destructive/10 text-destructive font-medium" : "border-border bg-card text-card-foreground"}`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}
