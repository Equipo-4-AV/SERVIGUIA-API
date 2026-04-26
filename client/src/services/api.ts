/**
 * Backwards-compatibility shim.
 *
 * The data layer now lives in `src/api/*`. This file simply re-exports the
 * public surface so existing imports (`@/services/api`) keep working without
 * touching every component.
 */
export {
  requestDiagnosis,
  historyFromMessages,
  apiConfig,
  isRealMode,
  API_MODE,
  API_BASE_URL,
  POLLING_INTERVAL_MS,
} from "@/api";