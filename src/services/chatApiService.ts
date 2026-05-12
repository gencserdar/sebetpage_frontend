// src/services/ChatApiService.ts
//
// Routes requests through the shared `api()` wrapper so this client inherits
// the 401-refresh-retry behavior instead of hand-rolling a Bearer header.

import { api } from "./apiService";

export interface MessagingGroup {
  id: number;
  type: string;
  title: string;
  createdAtMillis: number;
}

class ChatApiService {
  private baseUrl = "/api/chat";
  private groupBaseUrl = "/api/messaging-groups";

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

  async getConversations(): Promise<any[]> {
    const res = await api(`${this.baseUrl}/conversations`);
    if (!res.ok) throw new Error("Failed to get conversations");
    return res.json();
  }

  /**
   * Create a new messaging group.
   * memberIds: other participants (not including yourself — backend adds you as creator).
   */
  async createMessagingGroup(memberIds: number[], name?: string): Promise<MessagingGroup> {
    const res = await api(this.groupBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds, name: name ?? "" }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to create messaging group");
    }
    return res.json();
  }

  /**
   * Add a member to an existing messaging group.
   */
  async addMessagingGroupMember(groupId: number, userId: number): Promise<MessagingGroup> {
    const res = await api(`${this.groupBaseUrl}/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to add member");
    }
    return res.json();
  }
}

export const chatApiService = new ChatApiService();
