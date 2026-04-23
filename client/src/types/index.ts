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