/**
 * Authentication service.
 *
 * Talks to the PHARVO Django backend. Authenticated requests carry a JWT
 * access token; the authenticated user (including role) is cached so the
 * frontend can route users without decoding tokens locally.
 *
 * Override the API base with the `VITE_API_URL` environment variable.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

const ACCESS_TOKEN_KEY = "pharvo_access_token";
const REFRESH_TOKEN_KEY = "pharvo_refresh_token";
const USER_KEY = "pharvo_user";

export const ROLES = {
  ADMIN: "admin",
  PHARMACIST: "pharmacist",
  CUSTOMER: "customer",
};

/**
 * Return the stored JWT access token, or null when the user is signed out.
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Return the cached authenticated user object, or null.
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Return the cached role of the authenticated user, or null.
 */
export function getStoredRole() {
  return getStoredUser()?.role ?? null;
}

/**
 * The home path for a given role (used for role-based redirects).
 */
export function roleHomePath(role) {
  switch (role) {
    case ROLES.ADMIN:
      return "/admin/dashboard";
    case ROLES.PHARMACIST:
      return "/pharmacist/dashboard";
    case ROLES.CUSTOMER:
      return "/customer/portal";
    default:
      return "/";
  }
}

/**
 * Persist the session returned by the backend (tokens + user).
 */
function persistSession(data) {
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

/**
 * Remove all stored session data (used on sign-out and expired sessions).
 */
export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractMessage(data) {
  if (!data || typeof data !== "object") {
    return "";
  }
  if (typeof data.detail === "string") {
    return data.detail;
  }
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

async function requestJson(path, { method = "GET", body, token } = {}) {
  let response;

  try {
    const headers = {};
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Unable to connect to the PHARVO service. Please try again.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    let message = "Request failed.";
    if (isJson) {
      const data = await response.json().catch(() => ({}));
      message = extractMessage(data) || message;
    }
    throw new ApiError(message, response.status);
  }

  if (!isJson) {
    throw new ApiError("Unexpected response from the PHARVO service.");
  }

  return response.json();
}

/**
 * Authenticate with email/username and password.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ access: string, refresh: string, user: object }>}
 */
export async function loginUser({ username, password }) {
  const data = await requestJson("/auth/login/", {
    method: "POST",
    body: { username, password },
  });
  persistSession(data);
  return data;
}

/**
 * Create a pharmacist or customer account (admin is never allowed publicly).
 *
 * The backend `SignupSerializer` requires a `username` and returns ONLY the
 * created user (no tokens), so we:
 *   1. build the backend payload (username derived from the email, full_name
 *      split into first/last name),
 *   2. POST /auth/signup/,
 *   3. immediately sign in to obtain session tokens (the backend exposes no
 *      token pair on signup).
 *
 * @param {{ full_name: string, email: string, password: string,
 *           confirm_password: string, role: string }} details
 * @returns {Promise<{ access: string, refresh: string, user: object }>}
 */
export async function signupUser(details) {
  const { full_name, email, password, role } = details;
  const [first = "", ...rest] = String(full_name || "").trim().split(/\s+/);
  const lastName = rest.join(" ");
  const username = String(email || "").trim().split("@")[0] || `user_${Date.now()}`;

  await requestJson("/auth/signup/", {
    method: "POST",
    body: {
      username,
      password,
      first_name: first,
      last_name: lastName,
      email: String(email || "").trim(),
      role,
    },
  });

  // Sign up never returns tokens, so sign in to establish the session.
  return loginUser({ username, password });
}

/**
 * Fetch the current user from the backend (server-side role source).
 *
 * @throws {ApiError} with status 401 when the session is invalid.
 */
export async function fetchMe() {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError("Authentication required. Please sign in.", 401);
  }
  return requestJson("/auth/me/", { token });
}