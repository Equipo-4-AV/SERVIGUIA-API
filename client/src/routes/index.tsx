import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Github, Cog } from "lucide-react";
import type { ChatMessage, DiagnosisResponse } from "@/types";
import { Chat } from "@/components/Chat";
import { JsonPreview } from "@/components/JsonPreview";
import { apiConfig } from "@/services/api";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastDiagnosis, setLastDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [source, setSource] = useState<"api" | "mock" | null>(null);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                ServiGuía
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Diagnóstico inteligente para servicios del hogar
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <Cog className="h-3.5 w-3.5" />
            <span className="font-mono">{apiConfig.mode}</span>
            <span className="text-border">·</span>
            <span className="font-mono truncate max-w-[180px]">{apiConfig.baseUrl}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="h-[calc(100vh-180px)] min-h-[600px]">
            <Chat
              messages={messages}
              setMessages={setMessages}
              onDiagnosis={(d, s) => {
                setLastDiagnosis(d);
                setSource(s);
              }}
            />
          </div>
          <aside className="h-[calc(100vh-180px)] min-h-[600px] lg:sticky lg:top-6">
            <JsonPreview data={lastDiagnosis} source={source} />
          </aside>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            Demo académica · Frontend listo para conectar a una API REST en Python (FastAPI)
          </p>
          <a
            href="https://github.com"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            ServiGuía Demo
          </a>
        </footer>
      </main>
    </div>
  );
}
