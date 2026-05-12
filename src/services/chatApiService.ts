// src/services/ChatApiService.ts
//
// Routes requests through the shared `api()` wrapper so this client inherits
// the 401-refresh-retry behavior instead of hand-rolling a Bearer header.

import { api } from "./apiService";

export interface MessagingGroup {
  id: number;
  type: string;
  title: string;
  description?: string;
  imageUrl?: string;
  createdById?: number;
  createdAtMillis: number;
}

export interface MessagingGroupPermissions {
  canChangePhoto: boolean;
  canChangeDescription: boolean;
  canChangeName: boolean;
  canRemoveMembers: boolean;
  canAddMembers: boolean;
}

export interface MessagingGroupParticipant {
  id: number;
  userId: number;
  nickname: string;
  name?: string;
  surname?: string;
  profileImageUrl?: string;
  role: string;
  muted: boolean;
  permissions: MessagingGroupPermissions;
}

export interface MessagingGroupDetail extends MessagingGroup {
  me: MessagingGroupParticipant;
  participants: MessagingGroupParticipant[];
  knownParticipants?: MessagingGroupParticipant[];
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

  async getMessagingGroup(groupId: number): Promise<MessagingGroupDetail> {
    const res = await api(`${this.groupBaseUrl}/${groupId}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to get messaging group");
    }
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
  async addMessagingGroupMember(groupId: number, userId: number): Promise<MessagingGroupDetail> {
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

  async removeMessagingGroupMember(groupId: number, userId: number): Promise<MessagingGroupDetail> {
    const res = await api(`${this.groupBaseUrl}/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to remove member");
    }
    return res.json();
  }

  async updateMessagingGroup(
    groupId: number,
    patch: Partial<Pick<MessagingGroup, "title" | "description" | "imageUrl">>
  ): Promise<MessagingGroupDetail> {
    const res = await api(`${this.groupBaseUrl}/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to update group");
    }
    return res.json();
  }

  async uploadMessagingGroupPhoto(groupId: number, file: File): Promise<MessagingGroupDetail> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api(`${this.groupBaseUrl}/${groupId}/photo`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to upload group photo");
    }
    return res.json();
  }

  async updateMessagingGroupParticipant(
    groupId: number,
    userId: number,
    patch: { muted?: boolean; permissions?: MessagingGroupPermissions }
  ): Promise<MessagingGroupDetail> {
    const res = await api(`${this.groupBaseUrl}/${groupId}/participants/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to update group participant");
    }
    return res.json();
  }

  async exitMessagingGroup(groupId: number): Promise<void> {
    const res = await api(`${this.groupBaseUrl}/${groupId}/members/me`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to exit group");
    }
  }

  async deleteMessagingGroup(groupId: number): Promise<void> {
    const res = await api(`${this.groupBaseUrl}/${groupId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to delete group");
    }
  }
}

export const chatApiService = new ChatApiService();
