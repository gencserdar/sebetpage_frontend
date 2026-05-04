import { api } from "./apiService";

/**
 * Access tokens live in memory only — never localStorage / sessionStorage.
 *
 * Why: anything in localStorage is readable by *any* JavaScript that
 * executes on the page, including XSS payloads. A 1-minute access token
 * stolen by XSS is still 1 minute of free reign on the API, and an XSS
 * that polls every minute keeps the session forever.
 *
 * In-memory means the token vanishes on tab close / hard reload, but the
 * HttpOnly refresh cookie on the backend lets us mint a fresh access token
 * silently on app boot via /api/auth/refresh. So users still get
 * "remember me"; XSS just gets nothing useful.
 */
let accessToken: string | null = null;

export const getAccessToken = () => accessToken;

function clearLegacyAccessTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "jwt-token=; Max-Age=0; Path=/; SameSite=Lax";
}

export const setAccessToken = (token: string) => {
  clearLegacyAccessTokenCookie();
  accessToken = token;
};

export const removeAccessToken = () => {
  clearLegacyAccessTokenCookie();
  accessToken = null;
};

clearLegacyAccessTokenCookie();

/**
 * Whether we *currently* hold a token. NOTE: on a fresh page load this is
 * false even for users with a valid refresh cookie. Callers that need to
 * know "is this user logged in?" should rely on the user-context bootstrap
 * (refreshUser → /api/user/me) rather than this flag, since the bootstrap
 * triggers the refresh cookie → access token exchange.
 */
export function isLoggedIn(): boolean {
  return !!accessToken;
}

export async function logout() {
  try {
    // Clear the in-memory token first so concurrent requests stop
    // sending it the moment logout is initiated.
    removeAccessToken();

    const res = await api("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Başarısızsa bile throw etme; logla geç
    if (!res.ok) {
      const txt = await res.text();
      console.warn("Logout not ok:", txt);
    }
  } catch (err) {
    console.warn("Logout request failed:", err);
  }
}

export async function login(email: string, password: string, rememberMe: boolean): Promise<boolean> {
  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const data = await res.json();
    const token = data.token || data.accessToken;
    if (!token) throw new Error("No token returned");

    setAccessToken(token);
    
    return true;
  } catch (err) {
    console.error("Login error:", err);
    throw err;
  }
}

export async function register(
  name: string,
  surname: string,
  email: string,
  password: string,
  nickname: string
): Promise<boolean> {
  try {
    const res = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, surname, email, password, nickname }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    let data: any;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { message: text };
    }

    const token = data.token || data.accessToken;
    if (!token) {
      console.log(data.message || "Registration successful");
      return true; 
    }

    setAccessToken(token);
    return true;
  } catch (err) {
    console.error("Register error:", err);
    throw err;
  }
}

export async function forgotPassword(email: string): Promise<boolean> {
  try {
    const res = await api(`/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
      method: "POST"
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return true;
  } catch (err) {
    console.error("Forgot password error:", err);
    throw err;
  }
}

export async function resetPassword(code: string, newPassword: string): Promise<boolean> {
  try {
    const res = await api(`/api/auth/reset-password?code=${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return true;
  } catch (err) {
    console.error("Reset password error:", err);
    throw err;
  }
}

