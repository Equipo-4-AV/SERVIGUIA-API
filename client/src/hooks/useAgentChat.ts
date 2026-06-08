import { useState, useRef, useCallback } from "react";
import type { ChatMessage, BackendProvider, StatusResponse } from "../types";
import { startKickoff, sendPrompt, getStatus, getOutput } from "../api";

const SERVER_ERROR_MESSAGE =
  "Error de servidor. Espera unos minutos o llama a emergencias si necesitas ayuda inmediata.";

// SUTITUTO SEGURO: Genera un ID único para React sin depender de HTTPS
const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback matemático ultra rápido si crypto no está disponible
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<StatusResponse["result"] | null>(null);

  const taskIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, image: File | null = null) => {
    if (!text.trim()) return;

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setError(null);

    const isNewConversation = !taskIdRef.current;

    // Add user message to UI immediately
    setMessages((prev) => {
      const newMessages = [...prev];
      if (isNewConversation && prev.length > 0) {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.type !== "separator") {
          newMessages.push({
            id: generateId(),
            role: "system",
            type: "separator",
            timestamp: Date.now(),
          });
        }
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        type: "text",
        text,
        timestamp: Date.now(),
      };
      if (image) {
        userMsg.imageUrl = URL.createObjectURL(image);
      }
      newMessages.push(userMsg);
      return newMessages;
    });
    setIsProcessing(true);

    try {
      // 1. Kickoff si no hay tarea activa
      let taskId = taskIdRef.current;
      if (!taskId) {
        taskId = await startKickoff(signal);
        taskIdRef.current = taskId;
        setCurrentResult(null);
      }

      // 2. Enviar prompt real
      await sendPrompt(taskId, text, image, signal);

      // 3. Polling loop
      while (!signal.aborted) {
        // Esperamos 2 segundos entre cada intento (polling)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusRes = await getStatus(taskId, signal);
        const { status, history, result, message, error: backendError } = statusRes;

        // El backend concatena la respuesta del asistente al final del historial
        const lastAssistantMsg =
          history
            ?.slice()
            .reverse()
            .find((m) => m.role === "assistant")?.content || "";

        if (status === "requires_clarification") {
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "assistant",
              type: "text",
              text: message || lastAssistantMsg || "Necesito más información.",
              timestamp: Date.now(),
            },
          ]);
          setIsProcessing(false);
          break; // Salimos del polling, esperamos siguiente input del usuario
        } else if (status === "failed" || status === "not_found") {
          if (backendError) {
            console.error("Error reportado por el servidor:", backendError);
          }
          throw new Error(SERVER_ERROR_MESSAGE);
        } else if (status === "completed") {
          setCurrentResult(result || null);

          if (result?.es_emergencia) {
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "assistant",
                type: "text",
                text: result.safety_message || "¡EMERGENCIA DETECTADA!",
                timestamp: Date.now(),
              },
            ]);
          } else {
            // Ya se completó el pipeline, obtenemos proveedores
            const outputRes = await getOutput(taskId, signal);

            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "assistant",
                type: "text",
                text:
                  lastAssistantMsg ||
                  "Diagnóstico completado. Aquí están los proveedores recomendados:",
                timestamp: Date.now(),
              },
              {
                id: generateId(),
                role: "assistant",
                type: "providers",
                providers: outputRes.providers || [],
                subcategories: result?.subcategorias || [],
                timestamp: Date.now(),
              },
            ]);
          }

          // La tarea terminó exitosamente, cerramos este taskId
          taskIdRef.current = null;
          setIsProcessing(false);
          break;
        }
        // Si status === "starting" o "processing", el loop continúa.
      }
    } catch (err: unknown) {
      const isCanceledError =
        err instanceof Error && (err.name === "AbortError" || err.message === "canceled");

      if (!isCanceledError) {
        console.error("Error en flujo de chat:", err);
        setError(SERVER_ERROR_MESSAGE);
        taskIdRef.current = null; // Reset taskId para no atorarnos en una tarea corrupta
        setIsProcessing(false);
      }
    }
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setCurrentResult(null);
    setIsProcessing(false);
    taskIdRef.current = null;
  }, []);

  return {
    messages,
    isProcessing,
    error,
    currentResult,
    sendMessage,
    clearChat,
  };
}
