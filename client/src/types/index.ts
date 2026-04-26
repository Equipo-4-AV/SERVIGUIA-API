export type UrgencyLevel = "CRÍTICO" | "MODERADO" | "NORMAL";

export interface Provider {
  id: string;
  nombre: string;
  categoria: string;
  rating: number;
  badges: string[];
  rango_precio: string;
  disponibilidad: string;
}

export type PipelineStage =
  | "emergency_check"
  | "classification"
  | "follow_up"
  | "recommendation"
  | "done";

export type PipelineStatus = "processing" | "needs_input" | "emergency" | "ready" | "error";

export interface EmergencyAnalysis {
  is_emergency: boolean;
  nivel_urgencia: UrgencyLevel;
  accion_inmediata: string | null;
  numero_emergencia: string | null;
  motivo: string | null;
}

export interface DiagnosisBlock {
  categoria: string | null;
  subcategoria: string | null;
  resumen: string;
  confianza: number; // 0..1
  pregunta_seguimiento: string | null;
}

export interface RecommendationBlock {
  ready: boolean;
  motivo_no_listo: string | null;
  proveedores: Provider[];
}

export interface InputSummary {
  texto: string;
  tiene_imagen: boolean;
  turno: number;
}

export interface DiagnosisResponse {
  status: PipelineStatus;
  stage: PipelineStage;
  input_summary: InputSummary;
  emergency_analysis: EmergencyAnalysis;
  diagnosis: DiagnosisBlock | null;
  recommendation: RecommendationBlock;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageUrl?: string;
  diagnosis?: DiagnosisResponse;
  timestamp: number;
}

export interface ApiStatusResponse {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  error?: string;
}

export interface DiagnosisRequest {
  text: string;
  image?: File | null;
  history: { role: "user" | "assistant"; text: string }[];
}

// ---------------------------------------------------------------------------
// Backend contract (real mode) — mirrors the FastAPI service shape.
// The UI never consumes these directly: the backend service maps them into
// the existing DiagnosisResponse shape so components stay untouched.
// ---------------------------------------------------------------------------

export type BackendStatus =
  | "starting"
  | "processing"
  | "completed"
  | "failed"
  | "requires_clarification"
  | "not_found";

export interface KickoffResponse {
  task_id: string;
}

export interface PromptResponse {
  task_id: string;
  enqueued: boolean;
  detail?: string;
}

export interface BackendHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface DiagnosisResult {
  categoria: string | null;
  subcategoria: string[] | null;
  es_emergencia: boolean;
  safety_message: string | null;
}

export interface StatusResponse {
  status: BackendStatus;
  history?: BackendHistoryItem[];
  attempts?: number;
  result?: DiagnosisResult | null;
  error?: string;
}

export interface BackendProvider {
  id: string;
  name: string;
  category: string;
  rating: number;
  subcategories: string[];
  price_evaluation: string;
  available: string;
}

export interface OutputResponse {
  status: BackendStatus;
  providers: BackendProvider[];
}

export type ApiDebugStep =
  | "mode detection"
  | "mock"
  | "kickoff"
  | "prompt"
  | "status polling"
  | "output fetch";

export interface IntegrationDebugPayload {
  mode: "mock" | "real";
  step: ApiDebugStep;
  message: string;
  endpoint?: string;
  statusCode?: number;
  responseBody?: string;
  taskId?: string;
  baseUrl?: string;
  timestamp: string;
}