import type {
  ApiStatusResponse,
  ChatMessage,
  DiagnosisRequest,
  DiagnosisResponse,
} from "@/types";
import { buildMockDiagnosis } from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_MODE = (import.meta.env.VITE_API_MODE || "sync") as "sync" | "async";

/**
 * Build a multipart FormData payload — easy to consume from a Python FastAPI backend.
 */
function buildFormData(req: DiagnosisRequest): FormData {
  const fd = new FormData();
  fd.append("text", req.text);
  fd.append(
    "history",
    JSON.stringify(req.history.map((m) => ({ role: m.role, text: m.text }))),
  );
  if (req.image) fd.append("image", req.image);
  return fd;
}

async function postSync(req: DiagnosisRequest): Promise<DiagnosisResponse> {
  const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
    method: "POST",
    body: buildFormData(req),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return (await res.json()) as DiagnosisResponse;
}

async function postAsync(req: DiagnosisRequest): Promise<DiagnosisResponse> {
  const kickoff = await fetch(`${API_BASE_URL}/kickoff`, {
    method: "POST",
    body: buildFormData(req),
  });
  if (!kickoff.ok) throw new Error(`Kickoff failed: ${kickoff.status}`);
  const { task_id } = (await kickoff.json()) as { task_id: string };

  // Poll status every 2s
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(`${API_BASE_URL}/status/${task_id}`);
    if (!st.ok) throw new Error(`Status failed: ${st.status}`);
    const status = (await st.json()) as ApiStatusResponse;
    if (status.status === "completed") break;
    if (status.status === "failed") throw new Error(status.error || "Task failed");
  }

  const out = await fetch(`${API_BASE_URL}/output/${task_id}`);
  if (!out.ok) throw new Error(`Output failed: ${out.status}`);
  return (await out.json()) as DiagnosisResponse;
}

/**
 * Main entry point used by the UI. Falls back to mock data when the API is unreachable.
 * To replace mock data with the real backend: ensure VITE_API_BASE_URL points to a
 * running server and the response shape matches DiagnosisResponse.
 */
export async function requestDiagnosis(req: DiagnosisRequest): Promise<{
  data: DiagnosisResponse;
  source: "api" | "mock";
}> {
  try {
    const data = API_MODE === "async" ? await postAsync(req) : await postSync(req);
    return { data, source: "api" };
  } catch (err) {
    // Graceful fallback so the demo always works
    console.warn("[ServiGuía] API unavailable, using mock data:", err);
    await new Promise((r) => setTimeout(r, 800));
    const turn = Math.max(
      1,
      req.history.filter((m) => m.role === "user").length,
    );
    return {
      data: buildMockDiagnosis(req.text, !!req.image, turn),
      source: "mock",
    };
  }
}

export function historyFromMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, text: m.text }));
}

export const apiConfig = { baseUrl: API_BASE_URL, mode: API_MODE };