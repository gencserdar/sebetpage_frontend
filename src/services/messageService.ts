import { api } from "./apiService";
import type { Page } from "../hooks/useWebSocket";
import type { WsMessageDTO } from "../types/WSMessageDTO";

// New gateway mounts chat under /api/chat — latest is /latest, paged is /messages.

export async function fetchLatestMessages(conversationId: number, limit = 50): Promise<WsMessageDTO[]> {
  const res = await api(`/api/chat/conversations/${conversationId}/latest?limit=${limit}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`latest failed: ${res.status} ${t}`);
  }
  return res.json();
}

export async function fetchPagedMessages(
  conversationId: number,
  page = 0,
  size = 50
): Promise<Page<WsMessageDTO>> {
  const res = await api(`/api/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`page failed: ${res.status} ${t}`);
  }
  return res.json();
}
