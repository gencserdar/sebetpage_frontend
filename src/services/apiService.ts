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
 *
 * Proactive refresh
 * -----------------
 * scheduleProactiveRefresh() is called every time a new access token is stored.
 * It sets a timer to fire 15 seconds before the token expires so that the
 * token is silently rotated in the background — no 401 round-trip, no retry,
 * no visible latency for the user.
 *
 * Timeline (access token TTL = 60 s):
 *   t=0   login / refresh  → token stored, timer set for t=45
 *   t=45  timer fires      → background /refresh → new token stored, new timer set for t=90
 *   t=60  old token expires (already replaced at t=45, no impact)
 */

const REFRESH_URL = "/api/auth/refresh";
let refreshPromise: Promise<string | null> | null = null;
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

// ─── helpers ────────────────────────────────────────────────────────────────

/** Parse the JWT exp claim; returns ms remaining until expiry, or 0. */
function msUntilExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (typeof payload.exp !== "number") return 0;
    return Math.max(0, payload.exp * 1000 - Date.now());
  } catch {
    return 0;
  }
}

// ─── refresh ────────────────────────────────────────────────────────────────

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
        setAccessToken(newToken);           // also reschedules proactive refresh
        return newToken;
      } catch {
        return null;
      } finally {
        setTimeout(() => { refreshPromise = null; }, 0);
      }
    })();
  }
  return refreshPromise;
}

// ─── proactive refresh scheduling ───────────────────────────────────────────

const PROACTIVE_LEAD_MS = 15_000; // refresh 15 s before expiry

/**
 * Schedule a silent background /refresh call 15 seconds before the token
 * expires. Call this every time a new access token is stored. If a timer is
 * already running it is replaced with one for the new token's expiry.
 *
 * The self-scheduling chain:
 *   setAccessToken → scheduleProactiveRefresh → (timer fires) →
 *   refreshAccessToken → setAccessToken → scheduleProactiveRefresh → …
 *
 * This keeps the token perpetually fresh as long as the tab is open and
 * the user has a valid refresh cookie, with zero 401 round-trips.
 */
export function scheduleProactiveRefresh(token: string): void {
  if (proactiveTimer !== null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  const fireIn = msUntilExpiry(token) - PROACTIVE_LEAD_MS;
  if (fireIn <= 0) return; // token already near expiry — let reactive path handle it

  proactiveTimer = setTimeout(async () => {
    proactiveTimer = null;
    await refreshAccessToken();
  }, fireIn);
}

/** Cancel the pending proactive refresh (called on logout). */
export function cancelProactiveRefresh(): void {
  if (proactiveTimer !== null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

// ─── fetch wrapper ───────────────────────────────────────────────────────────

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
  return url.includes("/api/auth/");
}

export const api = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const first = await fetch(url, buildInit(options, getAccessToken()));
  const needsRefresh = (first.status === 401 || first.status === 403) && !isAuthEndpoint(url);
  if (!needsRefresh) return first;

  const newToken = await refreshAccessToken();
  if (!newToken) {
    removeAccessToken();
    return first;
  }
  return fetch(url, buildInit(options, newToken));
};
