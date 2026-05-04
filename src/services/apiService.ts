import { getAccessToken, setAccessToken, removeAccessToken } from "./authService";

/**
 * Central fetch wrapper. Responsibilities:
 *
 *  1. Attach `Authorization: Bearer <accessToken>` from memory.
 *  2. Always send the refreshToken HttpOnly cookie (`credentials: "include"`).
 *  3. On 401, call POST /api/auth/refresh exactly once (concurrent 401s are
 *     coalesced into a single refresh via `refreshPromise`), swap in the new
 *     access token, and retry the original request.
 *  4. If refresh fails, clear the access token and return the original
 *     401/403 so the caller can decide how to present logged-out UI.
 */

const REFRESH_URL = "/api/auth/refresh";
let refreshPromise: Promise<string | null> | null = null;

/** Call /refresh at most once at a time; returns the new access token or null. */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(REFRESH_URL, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return null;
        const data = await res.json();
        const newToken: string | undefined = data.accessToken ?? data.token;
        if (!newToken) return null;
        setAccessToken(newToken);
        return newToken;
      } catch {
        return null;
      } finally {
        // Let the next 401 trigger a fresh /refresh call.
        setTimeout(() => { refreshPromise = null; }, 0);
      }
    })();
  }
  return refreshPromise;
}

function buildInit(options: RequestInit, token: string | null): RequestInit {
  return {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

function isAuthEndpoint(url: string): boolean {
  // Never try to auto-refresh on the auth endpoints themselves; a 401 from
  // /login means "wrong password", not "expired session".
  return url.includes("/api/auth/");
}

export const api = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const first = await fetch(url, buildInit(options, getAccessToken()));
  // Spring Security returns 403 on an empty SecurityContext by default and
  // 401 only when a custom AuthenticationEntryPoint is configured. Treat
  // both as "token expired / missing" so the refresh path stays robust
  // even if a downstream service forgets to wire the entry point.
  const needsRefresh = (first.status === 401 || first.status === 403) && !isAuthEndpoint(url);
  if (!needsRefresh) return first;

  // Token expired / missing — try refresh once, then retry the original.
  const newToken = await refreshAccessToken();
  if (!newToken) {
    removeAccessToken();
    return first; // caller sees the original 401/403
  }
  return fetch(url, buildInit(options, newToken));
};
