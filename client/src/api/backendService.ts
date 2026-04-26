import type {
  BackendProvider,
  DiagnosisRequest,
  DiagnosisResponse,
  KickoffResponse,
  OutputResponse,
  Provider,
  StatusResponse,
  UrgencyLevel,
} from "@/types";
import { apiUrl, POLLING_INTERVAL_MS } from "./client";
import {
  ApiStepError,
  apiErrorFromResponse,
  apiErrorFromUnknown,
  makeDebugPayload,
} from "./debug";

/**
 * Real backend service.
 *
 * Flow:
 *   1. GET  /kickoff                         → task_id
 *   2. POST /api/prompt/{task_id}            → enqueue prompt (multipart)
 *   3. GET  /api/status/{task_id}            → poll until terminal status
 *   4. GET  /api/output/{task_id}            → fetch providers (when completed)
 *
 * Terminal statuses: completed | failed | requires_clarification | not_found.
 * Polling uses VITE_POLLING_INTERVAL_MS (default 2000ms) and an AbortSignal
 * so callers can cancel in-flight loops cleanly.
 */

async function kickoff(signal?: AbortSignal): Promise<string> {
  const endpoint = apiUrl("/kickoff");
  try {
    const res = await fetch(endpoint, { method: "GET", signal });
    if (!res.ok) throw await apiErrorFromResponse("kickoff", endpoint, res);
    const json = (await res.json()) as KickoffResponse;
    return json.task_id;
  } catch (error) {
    if (error instanceof ApiStepError) throw error;
    throw apiErrorFromUnknown("kickoff", error, endpoint);
  }
}

async function sendPrompt(
  taskId: string,
  req: DiagnosisRequest,
  signal?: AbortSignal,
): Promise<void> {
  const endpoint = apiUrl(`/api/prompt/${taskId}`);
  const fd = new FormData();
  // The "context" field carries the user's latest message plus history so the
  // backend has full conversational context.
  const context = JSON.stringify({
    text: req.text,
    history: req.history,
  });
  fd.append("context", context);
  if (req.image) fd.append("image", req.image);

  try {
    const res = await fetch(endpoint, { method: "POST", body: fd, signal });
    if (!res.ok) throw await apiErrorFromResponse("prompt", endpoint, res, taskId);
  } catch (error) {
    if (error instanceof ApiStepError) throw error;
    throw apiErrorFromUnknown("prompt", error, endpoint, taskId);
  }
}

async function fetchStatus(
  taskId: string,
  signal?: AbortSignal,
): Promise<StatusResponse> {
  const endpoint = apiUrl(`/api/status/${taskId}`);
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) throw await apiErrorFromResponse("status polling", endpoint, res, taskId);
    return (await res.json()) as StatusResponse;
  } catch (error) {
    if (error instanceof ApiStepError) throw error;
    throw apiErrorFromUnknown("status polling", error, endpoint, taskId);
  }
}

async function fetchOutput(
  taskId: string,
  signal?: AbortSignal,
): Promise<OutputResponse> {
  const endpoint = apiUrl(`/api/output/${taskId}`);
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) throw await apiErrorFromResponse("output fetch", endpoint, res, taskId);
    return (await res.json()) as OutputResponse;
  } catch (error) {
    if (error instanceof ApiStepError) throw error;
    throw apiErrorFromUnknown("output fetch", error, endpoint, taskId);
  }
}

function isTerminal(status: StatusResponse["status"]): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "requires_clarification" ||
    status === "not_found"
  );
}

async function pollUntilTerminal(
  taskId: string,
  signal?: AbortSignal,
): Promise<StatusResponse> {
  // Cap at ~5 minutes to avoid runaway loops.
  const maxAttempts = Math.ceil((5 * 60 * 1000) / POLLING_INTERVAL_MS);
  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const status = await fetchStatus(taskId, signal);
    if (isTerminal(status.status)) return status;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, POLLING_INTERVAL_MS);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
  throw new Error("Polling timed out");
}

// --- Mapping helpers (backend shape → existing UI shape) -------------------

function mapProvider(p: BackendProvider): Provider {
  return {
    id: p.id,
    nombre: p.name,
    categoria: p.category,
    rating: p.rating,
    badges: p.subcategories ?? [],
    rango_precio: p.price_evaluation,
    disponibilidad: p.available,
  };
}

function lastAssistantText(status: StatusResponse): string {
  const history = status.history ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].content;
  }
  return "";
}

function buildResponse(
  req: DiagnosisRequest,
  status: StatusResponse,
  output: OutputResponse | null,
): DiagnosisResponse {
  const turn = Math.max(1, req.history.filter((m) => m.role === "user").length);
  const isEmergency = !!status.result?.es_emergencia;
  const urgencia: UrgencyLevel = isEmergency ? "CRÍTICO" : "NORMAL";

  // Clarification → follow-up card.
  if (status.status === "requires_clarification") {
    return {
      status: "needs_input",
      stage: "follow_up",
      input_summary: { texto: req.text, tiene_imagen: !!req.image, turno: turn },
      emergency_analysis: {
        is_emergency: false,
        nivel_urgencia: "NORMAL",
        accion_inmediata: null,
        numero_emergencia: null,
        motivo: null,
      },
      diagnosis: {
        categoria: null,
        subcategoria: null,
        resumen: lastAssistantText(status) || "Necesitamos un poco más de información.",
        confianza: 0.4,
        pregunta_seguimiento:
          lastAssistantText(status) || "¿Puedes darnos más detalles sobre el problema?",
      },
      recommendation: {
        ready: false,
        motivo_no_listo: "Se necesita una respuesta a la pregunta de seguimiento.",
        proveedores: [],
      },
    };
  }

  if (status.status === "failed" || status.status === "not_found") {
    throw new ApiStepError(
      makeDebugPayload({
        step: "status polling",
        message: status.error || `Pipeline ended with status ${status.status}`,
      }),
    );
  }

  // Completed
  const result = status.result;
  const proveedores = (output?.providers ?? []).map(mapProvider);

  return {
    status: isEmergency ? "emergency" : "ready",
    stage: "done",
    input_summary: { texto: req.text, tiene_imagen: !!req.image, turno: turn },
    emergency_analysis: {
      is_emergency: isEmergency,
      nivel_urgencia: urgencia,
      accion_inmediata: result?.safety_message ?? null,
      numero_emergencia: isEmergency ? "911" : null,
      motivo: result?.safety_message ?? null,
    },
    diagnosis: result
      ? {
          categoria: result.categoria,
          subcategoria: result.subcategoria?.[0] ?? null,
          resumen: lastAssistantText(status) || "Diagnóstico listo.",
          confianza: 0.9,
          pregunta_seguimiento: null,
        }
      : null,
    recommendation: {
      ready: !isEmergency && proveedores.length > 0,
      motivo_no_listo: isEmergency
        ? "Caso clasificado como emergencia."
        : proveedores.length === 0
          ? "Sin proveedores disponibles para este caso."
          : null,
      proveedores,
    },
  };
}

/**
 * Run one conversational turn against the real backend.
 *
 * If `existingTaskId` is provided we reuse it (so clarification replies stay
 * in the same conversation). Otherwise we kick off a fresh task. The returned
 * `taskId` MUST be persisted by the caller and passed back on the next turn.
 *
 * If the output endpoint isn't ready yet on the first try, we retry a few
 * times with the same polling interval before giving up gracefully.
 */
export async function realRequestDiagnosis(
  req: DiagnosisRequest,
  options: { taskId?: string; signal?: AbortSignal } = {},
): Promise<{ data: DiagnosisResponse; taskId: string }> {
  const { signal } = options;
  const taskId = options.taskId ?? (await kickoff(signal));

  await sendPrompt(taskId, req, signal);
  const status = await pollUntilTerminal(taskId, signal);

  if (status.status === "failed" || status.status === "not_found") {
    throw new ApiStepError(
      makeDebugPayload({
        step: "status polling",
        endpoint: apiUrl(`/api/status/${taskId}`),
        taskId,
        responseBody: JSON.stringify(status),
        message: status.error || `Pipeline ended with status ${status.status}`,
      }),
    );
  }

  let output: OutputResponse | null = null;
  if (status.status === "completed" && !status.result?.es_emergencia) {
    // Output may lag slightly behind status — retry a few times.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        output = await fetchOutput(taskId, signal);
        if (output && output.providers && output.providers.length >= 0) break;
      } catch {
        // ignore and retry
      }
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, POLLING_INTERVAL_MS);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
  }
  return { data: buildResponse(req, status, output), taskId };
}