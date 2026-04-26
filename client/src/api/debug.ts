import type { ApiDebugStep, IntegrationDebugPayload } from "@/types";
import { apiConfig } from "./client";

const DEV_JSON_ENABLED = import.meta.env.VITE_SHOW_DEV_JSON === "true";

let latestDebugPayload: IntegrationDebugPayload | null = null;

export class ApiStepError extends Error {
  payload: IntegrationDebugPayload;

  constructor(payload: IntegrationDebugPayload) {
    super(payload.message);
    this.name = "ApiStepError";
    this.payload = payload;
  }
}

export function setIntegrationDebug(payload: IntegrationDebugPayload) {
  latestDebugPayload = payload;
  if (import.meta.env.DEV) {
    console.error("[ServiApp integration]", payload);
  }
}

export function getLatestIntegrationDebug() {
  return DEV_JSON_ENABLED ? latestDebugPayload : null;
}

export function makeDebugPayload(input: {
  step: ApiDebugStep;
  message: string;
  endpoint?: string;
  statusCode?: number;
  responseBody?: string;
  taskId?: string;
}): IntegrationDebugPayload {
  return {
    mode: apiConfig.mode,
    baseUrl: apiConfig.baseUrl || undefined,
    timestamp: new Date().toISOString(),
    ...input,
  };
}

export async function apiErrorFromResponse(
  step: ApiDebugStep,
  endpoint: string,
  response: Response,
  taskId?: string,
) {
  const responseBody = await response.text().catch(() => "");
  return new ApiStepError(
    makeDebugPayload({
      step,
      endpoint,
      taskId,
      responseBody,
      statusCode: response.status,
      message: `${step} failed with HTTP ${response.status}`,
    }),
  );
}

export function apiErrorFromUnknown(
  step: ApiDebugStep,
  error: unknown,
  endpoint?: string,
  taskId?: string,
) {
  const message = error instanceof Error ? error.message : String(error);
  return new ApiStepError(makeDebugPayload({ step, endpoint, taskId, message }));
}