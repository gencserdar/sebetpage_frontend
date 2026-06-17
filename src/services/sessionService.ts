import { api } from "./apiService";

export interface SessionDTO {
  id: number;
  createdAtMillis: number;
  expiresAtMillis: number;
  rememberMe: boolean;
  current: boolean;
}

export async function listSessions(): Promise<SessionDTO[]> {
  const res = await api("/api/auth/sessions");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "Failed to load sessions");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.sessions ?? [];
}

export async function revokeSession(sessionId: number): Promise<void> {
  const res = await api(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "Failed to revoke session");
  }
}

export async function logoutAll(options?: { excludeCurrent?: boolean }): Promise<void> {
  const res = await api("/api/auth/logout-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "Failed to sign out");
  }
}
