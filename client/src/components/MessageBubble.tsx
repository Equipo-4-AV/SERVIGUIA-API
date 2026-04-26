import type { ChatMessage } from "@/types";
import { EmergencyCard } from "./EmergencyAlert";
import { FollowUpCard } from "./FollowUpCard";
import { DiagnosisCard } from "./DiagnosisCard";
import { RecommendationSection } from "./RecommendationSection";
import { Sparkles, User } from "lucide-react";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2 sm:gap-3">
        <div className="max-w-[80%] space-y-2 sm:max-w-[75%]">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Adjunto del usuario"
              className="ml-auto max-h-48 rounded-xl border border-border object-cover"
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

  const d = message.diagnosis;

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground sm:flex">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="w-full min-w-0 max-w-full space-y-3 sm:max-w-[85%]">
        {/* Emergency takes precedence — no diagnosis or recommendation */}
        {d?.emergency_analysis.is_emergency && (
          <EmergencyCard data={d.emergency_analysis} />
        )}

        {/* Diagnosis card (only when not an emergency and we have a diagnosis) */}
        {d && !d.emergency_analysis.is_emergency && d.diagnosis && (
          <DiagnosisCard diagnosis={d.diagnosis} emergency={d.emergency_analysis} />
        )}

        {/* Follow-up question — blocks recommendation */}
        {d &&
          !d.emergency_analysis.is_emergency &&
          d.status === "needs_input" &&
          d.diagnosis?.pregunta_seguimiento && (
            <FollowUpCard question={d.diagnosis.pregunta_seguimiento} />
          )}

        {/* Recommendation — only when ready === true */}
        {d && !d.emergency_analysis.is_emergency && d.status !== "needs_input" && (
          <RecommendationSection recommendation={d.recommendation} />
        )}

        {/* Plain assistant message fallback */}
        {!d && (
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 text-sm text-card-foreground shadow-[var(--shadow-card)]">
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
