import type { ChatMessage, DiagnosisRequest, DiagnosisResponse } from "@/types";
import { apiConfig, isRealMode } from "./client";
import { mockRequestDiagnosis } from "./mockService";
import { realRequestDiagnosis } from "./backendService";
import { ApiStepError, apiErrorFromUnknown, setIntegrationDebug } from "./debug";

/**
 * Single unified entry point for the UI. Components should never know whether
 * data comes from the mock service or the real backend — that decision lives
 * here based on the .env configuration.
 *
 * In real mode, network failures are surfaced as errors so the UI can show a
 * proper error state. We deliberately do NOT silently fall back to mock data
 * in real mode (that would mask backend issues during integration).
 * Mock mode is fully offline and never attempts a fetch.
 */
export interface RequestOptions {
  /** Reuse an existing task across conversation turns (real mode only). */
  taskId?: string;
  signal?: AbortSignal;
}

export interface RequestResult {
  data: DiagnosisResponse;
  source: "api" | "mock";
  /** taskId for the conversation. In mock mode this is a stable local id. */
  taskId: string;
}

export async function requestDiagnosis(
  req: DiagnosisRequest,
  options: RequestOptions = {},
): Promise<RequestResult> {
  try {
    if (isRealMode()) {
      const { data, taskId } = await realRequestDiagnosis(req, options);
      return { data, source: "api", taskId };
    }
    const data = await mockRequestDiagnosis(req);
    return { data, source: "mock", taskId: options.taskId ?? "mock-task" };
  } catch (error) {
    if (error instanceof ApiStepError) {
      setIntegrationDebug(error.payload);
      throw error;
    }
    const wrapped = apiErrorFromUnknown(isRealMode() ? "status polling" : "mock", error);
    setIntegrationDebug(wrapped.payload);
    throw wrapped;
  }
}

export function historyFromMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, text: m.text }));
}

export { apiConfig };
export { isRealMode, API_MODE, API_BASE_URL, POLLING_INTERVAL_MS } from "./client";
export { getLatestIntegrationDebug } from "./debug";