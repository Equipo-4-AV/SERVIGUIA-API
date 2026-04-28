import type { ChatMessage } from "@/types";
import { Sparkles, User } from "lucide-react";

export function MessageBubble({ message, onImageClick }: { message: ChatMessage; onImageClick?: (url: string) => void }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2 sm:gap-3">
        <div className="max-w-[80%] space-y-2 sm:max-w-[75%]">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Adjunto del usuario"
              onClick={() => onImageClick?.(message.imageUrl!)}
              className="ml-auto max-h-48 rounded-xl border border-border object-cover cursor-pointer transition-opacity hover:opacity-90"
            />
          )}
          <div className="rounded-2xl rounded-tr-sm bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm text-primary-foreground shadow-[var(--shadow-elegant)]">
            {message.text}
          </div>
        </div>
        <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground sm:flex">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground sm:flex">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="w-full min-w-0 max-w-full space-y-3 sm:max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 text-sm text-card-foreground shadow-[var(--shadow-card)]">
          {message.text}
        </div>
      </div>
    </div>
  );
}
