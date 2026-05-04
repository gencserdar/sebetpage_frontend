// src/services/ChatApiService.ts
//
// Routes requests through the shared `api()` wrapper so this client inherits
// the 401-refresh-retry behavior instead of hand-rolling a Bearer header.

import { api } from "./apiService";

class ChatApiService {
  private baseUrl = "/api/chat";

  async markAsRead(conversationId: number) {
    const res = await api(`${this.baseUrl}/conversations/${conversationId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to mark as read");
    return res.json();
  }

  async getUnreadCounts() {
    const res = await api(`${this.baseUrl}/unread-counts`);
    if (!res.ok) throw new Error("Failed to get unread counts");
    return res.json();
  }
}

export const chatApiService = new ChatApiService();
