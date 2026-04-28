// ============================================================================
// Tipos Exactos del Backend (Fuente de Verdad)
// ============================================================================

export type Status =
  | "starting"
  | "processing"
  | "completed"
  | "failed"
  | "requires_clarification"
  | "not_found";

export interface ClassificationResult {
  categoria: string | null;
  subcategorias: string[] | null;
  es_emergencia: boolean;
  safety_message: string | null;
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

export interface StatusResponse {
  status: Status;
  history?: { role: "user" | "assistant"; content: string }[];
  attempts?: number;
  result?: ClassificationResult | null;
  error?: string;
  message?: string; // Mensaje de clarificación (cuando status === 'requires_clarification')
}

export interface OutputResponse {
  status: Status;
  providers: BackendProvider[];
}

// ============================================================================
// Tipos de Estado Frontend (Solo UI)
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageUrl?: string;
  timestamp: number;
}