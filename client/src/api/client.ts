/**
 * Environment-driven mode detection.
 *
 * - If VITE_API_BASE_URL is missing/empty/blank → mock mode.
 * - If VITE_API_BASE_URL has a real value → real backend mode.
 *
 * No code changes are needed to switch — just update the .env file.
 */

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const RAW_POLLING = (import.meta.env.VITE_POLLING_INTERVAL_MS ?? "").trim();

function normalizeBaseUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    const isBrowser = typeof window !== "undefined";
    const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
    if (isBrowser && window.location.hostname !== "localhost" && isLocalhost) return "";
    return value;
  } catch {
    return "";
  }
}

export const API_BASE_URL = normalizeBaseUrl(RAW_BASE_URL);
export const POLLING_INTERVAL_MS = (() => {
  const n = Number(RAW_POLLING);
  return Number.isFinite(n) && n > 0 ? n : 2000;
})();

export type ApiMode = "mock" | "real";

export const API_MODE: ApiMode = API_BASE_URL.length > 0 ? "real" : "mock";

export function isRealMode(): boolean {
  return API_MODE === "real";
}

/** Join the configured base URL with a path. Throws in mock mode. */
export function apiUrl(path: string): string {
  if (!isRealMode()) {
    throw new Error("apiUrl() called in mock mode — this is a bug.");
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  const tail = path.startsWith("/") ? path : `/${path}`;
  return `${base}${tail}`;
}

export const apiConfig = {
  baseUrl: API_BASE_URL,
  rawBaseUrl: RAW_BASE_URL,
  mode: API_MODE,
  pollingIntervalMs: POLLING_INTERVAL_MS,
};