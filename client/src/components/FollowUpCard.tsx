export function FollowUpCard({ question }: { question: string }) {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-sm font-medium text-foreground">
        Necesitamos un poco más de información.
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{question}</p>
    </div>
  );
}
