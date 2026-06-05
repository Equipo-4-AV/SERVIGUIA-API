import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { StatusResponse, OutputResponse } from "@/types";
import type {
  AccessTokenResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from "@/features/auth/types";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpiring,
  saveAccessToken,
} from "@/features/auth/tokenStorage";

// ============================================================================
// Configuración base de Axios
// ============================================================================

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

function isAuthRequestUrl(url?: string) {
  return Boolean(url?.includes("/api/auth/"));
}

function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login") return;

  window.location.assign("/login");
}

async function getFreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<AccessTokenResponse>(
        "/api/auth/refresh",
        { refresh_token: refreshToken },
        { baseURL },
      )
      .then((response) => {
        saveAccessToken(response.data.access_token);
        return response.data.access_token;
      })
      .catch(() => {
        clearAuthTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(async (config) => {
  if (isAuthRequestUrl(config.url)) {
    return config;
  }

  let accessToken = getAccessToken();

  if (!accessToken || isAccessTokenExpiring(accessToken)) {
    accessToken = await getFreshAccessToken();
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as RetriableRequestConfig | undefined;
    const isAuthRequest = isAuthRequestUrl(originalRequest?.url);

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      const accessToken = await getFreshAccessToken();

      if (accessToken) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      }
    }

    if (status === 401 && !isAuthRequest) {
      clearAuthTokens();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

// ============================================================================
// Funciones del API (Mapeo directo a los endpoints de Python)
// ============================================================================

export async function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>("/api/auth/register", payload);
  return response.data;
}

export async function loginUser(payload: LoginRequest): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>("/api/auth/login", payload);
  return response.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<AccessTokenResponse> {
  const response = await apiClient.post<AccessTokenResponse>("/api/auth/refresh", {
    refresh_token: refreshToken,
  });
  return response.data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await apiClient.post("/api/auth/logout", {
    refresh_token: refreshToken,
  });
}

/**
 * 1. POST /api/kickoff
 * Crea una nueva tarea (conversación) en el backend y devuelve el task_id.
 */
export async function startKickoff(signal?: AbortSignal): Promise<string> {
  const response = await apiClient.post<{ task_id: string }>(
    "/api/kickoff",
    {},
    { signal }
  );
  return response.data.task_id;
}

/**
 * 2. POST /api/prompt/{task_id}
 * Encola el mensaje de texto del usuario (y opcionalmente una imagen) para
 * que sea procesado por el Agente.
 */
export async function sendPrompt(
  taskId: string,
  text: string,
  image: File | null = null,
  signal?: AbortSignal
): Promise<void> {
  const formData = new FormData();
  
  // ¡CRÍTICO! El backend espera el "context" como texto plano, NO como un JSON con el historial.
  formData.append("context", text);
  
  if (image) {
    formData.append("image", image);
  }

  await apiClient.post(`/api/prompt/${taskId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    signal,
  });
}

/**
 * 3. GET /api/status/{task_id}
 * Obtiene el estado actual de la tarea. Se usa para hacer polling.
 */
export async function getStatus(
  taskId: string,
  signal?: AbortSignal
): Promise<StatusResponse> {
  const response = await apiClient.get<StatusResponse>(`/api/status/${taskId}`, {
    signal,
  });
  return response.data;
}

/**
 * 4. GET /api/output/{task_id}
 * Obtiene el resultado final y los proveedores recomendados.
 */
export async function getOutput(
  taskId: string,
  signal?: AbortSignal
): Promise<OutputResponse> {
  const response = await apiClient.get<OutputResponse>(`/api/output/${taskId}`, {
    signal,
  });
  return response.data;
}
