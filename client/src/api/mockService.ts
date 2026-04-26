import type { DiagnosisRequest, DiagnosisResponse } from "@/types";
import { buildMockDiagnosis } from "@/services/mockData";

/**
 * Mock implementation of the diagnosis service.
 * Simulates network latency so the UI loading states behave realistically.
 */
export async function mockRequestDiagnosis(
  req: DiagnosisRequest,
): Promise<DiagnosisResponse> {
  await new Promise((r) => setTimeout(r, 800));
  const turn = Math.max(1, req.history.filter((m) => m.role === "user").length);
  return buildMockDiagnosis(req.text, !!req.image, turn);
}