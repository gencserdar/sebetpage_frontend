import { api } from "./apiService";
import type { Page } from "../hooks/useChatSocket";
import type { WsMessageDTO } from "../types/WSMessageDTO";

// MessageDTO BE’de WsMessageDTO ile aynı alanlara sahipse direkt onu kullanıyoruz.
// Yoksa ayrı tip tanımla.
// Burada WsMessageDTO: { id, senderId, conversationId, content, createdAt }

export async function fetchLatestMessages(conversationId: number, limit = 50): Promise<WsMessageDTO[]> {
  const res = await api(`/api/conversations/${conversationId}/messages/latest?limit=${limit}`);
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
  const res = await api(`/api/conversations/${conversationId}/messages?page=${page}&size=${size}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`page failed: ${res.status} ${t}`);
  }
  return res.json();
}
