import type { AuthTokens } from "./types";

const ACCESS_TOKEN_KEY = "serviapp.access_token";
const REFRESH_TOKEN_KEY = "serviapp.refresh_token";
const LEGACY_ACCESS_TOKEN_KEY = "serviapp.access_token";
const AUTH_CHANGED_EVENT = "serviapp:auth-changed";

function canUseStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return window.atob(padded);
}

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveAuthTokens(tokens: AuthTokens) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  if (tokens.refresh_token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  emitAuthChanged();
}

export function saveAccessToken(accessToken: string) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  emitAuthChanged();
}

export function clearAuthTokens() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitAuthChanged();
}

export function isAccessTokenExpiring(accessToken: string, leewaySeconds = 60) {
  if (!canUseStorage()) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(accessToken.split(".")[1] ?? ""));
    const expiresAtMs = Number(payload.exp) * 1000;

    if (!Number.isFinite(expiresAtMs)) return true;

    return expiresAtMs <= Date.now() + leewaySeconds * 1000;
  } catch {
    return true;
  }
}

export function subscribeToAuthChanges(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUTH_CHANGED_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, listener);
}
