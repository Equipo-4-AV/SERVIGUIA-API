import { useState, useRef, useCallback } from 'react';
import type { ChatMessage, BackendProvider, StatusResponse } from '../types';
import { startKickoff, sendPrompt, getStatus, getOutput } from '../api';

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providers, setProviders] = useState<BackendProvider[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<StatusResponse['result'] | null>(null);

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
    
    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now()
    };
    if (image) {
      userMsg.imageUrl = URL.createObjectURL(image);
    }
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // 1. Kickoff si no hay tarea activa
      let taskId = taskIdRef.current;
      if (!taskId) {
        taskId = await startKickoff(signal);
        taskIdRef.current = taskId;
        setProviders([]); // Reset providers para la nueva conversación
        setCurrentResult(null);
      }

      // 2. Enviar prompt real
      await sendPrompt(taskId, text, image, signal);

      // 3. Polling loop
      while (!signal.aborted) {
        // Esperamos 2 segundos entre cada intento (polling)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await getStatus(taskId, signal);
        const { status, history, result, message, error: backendError } = statusRes;

        // El backend concatena la respuesta del asistente al final del historial
        const lastAssistantMsg = history?.slice().reverse().find(m => m.role === "assistant")?.content || "";

        if (status === "requires_clarification") {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: "assistant",
            text: message || lastAssistantMsg || "Necesito más información.",
            timestamp: Date.now()
          }]);
          setIsProcessing(false);
          break; // Salimos del polling, esperamos siguiente input del usuario
        }
        else if (status === "failed" || status === "not_found") {
          throw new Error(backendError || "Error procesando tu solicitud en el servidor.");
        }
        else if (status === "completed") {
          setCurrentResult(result || null);
          
          if (result?.es_emergencia) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: "assistant",
              text: result.safety_message || "¡EMERGENCIA DETECTADA!",
              timestamp: Date.now()
            }]);
          } else {
            // Ya se completó el pipeline, obtenemos proveedores
            const outputRes = await getOutput(taskId, signal);
            setProviders(outputRes.providers || []);
            
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: "assistant",
              text: lastAssistantMsg || "Diagnóstico completado. Aquí están los proveedores recomendados:",
              timestamp: Date.now()
            }]);
          }
          
          // La tarea terminó exitosamente, cerramos este taskId
          taskIdRef.current = null;
          setIsProcessing(false);
          break;
        }
        // Si status === "starting" o "processing", el loop continúa.
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && err.message !== "canceled") {
        console.error("Error en flujo de chat:", err);
        setError(err.message || "Ocurrió un error inesperado al conectar con el servidor.");
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
    setProviders([]);
    setError(null);
    setCurrentResult(null);
    setIsProcessing(false);
    taskIdRef.current = null;
  }, []);

  return {
    messages,
    providers,
    isProcessing,
    error,
    currentResult,
    sendMessage,
    clearChat
  };
}
