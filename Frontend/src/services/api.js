/**
 * PHARVO API client — shared HTTP layer.
 *
 * All API services talk to the Django REST Framework backend through this
 * module. It is responsible for:
 *   - resolving the backend base URL (VITE_API_URL, falling back to "/api"),
 *   - attaching the JWT access token to authenticated requests,
 *   - normalising errors into a single `ApiError`,
 *   - clearing the session and redirecting to the login screen on 401.
 */

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "/api";

const ACCESS_TOKEN_KEY = "pharvo_access_token";
const REFRESH_TOKEN_KEY = "pharvo_refresh_token";
const USER_KEY = "pharvo_user";

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredRole() {
  return getStoredUser()?.role ?? null;
}

export function persistSession(data) {
  if (data.access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  }
  if (data.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
  }
  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function extractMessage(data) {
  if (!data || typeof data !== "object") {
    return "";
  }
  if (typeof data.detail === "string") {
    if (data.error_type) {
      return `${data.detail} [${data.error_type}]`;
    }
    return data.detail;
  }
  if (typeof data.error_type === "string" && !Array.isArray(data)) {
    return data.error_type;
  }
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object") {
      const nested = extractMessage(value);
      if (nested) {
        return nested;
      }
    }
  }
  return "";
}

function isJsonResponse(response) {
  return (response.headers.get("content-type") ?? "").includes("application/json");
}

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === "AbortError") {
      throw new ApiError(
        "The request timed out. Please check that the PHARVO service is running and try again.",
        0
      );
    }
    throw err;
  }
}

async function parseError(response) {
  let message = "Request failed.";
  let data = null;
  try {
    if (isJsonResponse(response)) {
      data = await response.json();
      message = extractMessage(data) || message;
    } else if (response.statusText) {
      message = response.statusText;
    }
    if (message === "Request failed.") {
      message = `Request failed (HTTP ${response.status} ${response.statusText || ""}).`;
    }
  } catch {
    // ignore parse failures; fall back to the generic message
  }
  return { message, data };
}

function handleAuthFailure() {
  clearStoredTokens();
  if (window.location.pathname !== "/signup") {
    window.location.assign("/");
  }
}

/**
 * Perform a JSON request against the backend.
 *
 * @param {string} path - API path relative to the base, e.g. "/auth/login/"
 * @param {object} options
 * @param {string} [options.method="GET"]
 * @param {object} [options.body] - JSON payload (serialised automatically)
 * @param {boolean} [options.auth=true] - attach the Bearer access token
 * @returns {Promise<object>} parsed JSON response
 * @throws {ApiError}
 */
export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError("Authentication required. Please sign in.", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetchWithTimeout(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      "Unable to connect to the PHARVO service. Please try again.",
      0
    );
  }

  if (response.status === 401 && auth) {
    handleAuthFailure();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    const { message, data } = await parseError(response);
    throw new ApiError(message, response.status, data);
  }

  if (!isJsonResponse(response)) {
    throw new ApiError("Unexpected response from the PHARVO service.");
  }

  return response.json();
}
