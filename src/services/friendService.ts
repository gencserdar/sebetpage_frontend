import { api } from "./apiService";
import { FriendRequest } from "../types/friendRequestType";
import { FriendStatusResponse } from "../types/FriendStatusResponseType";
import { UserDTO } from "../types/userDTO";

/* ---------- helpers ---------- */
async function ensureOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

/* ---------- send / respond / cancel ---------- */

// Routes updated for the new gateway: the FriendRequestController is mounted
// at /api/friend-requests (plural), send takes ?toNickname= query param, and
// respond/cancel are keyed by {id} path param.

export async function sendFriendRequest(nickname: string): Promise<{ status: string; requestId?: number }> {
  const res = await api(`/api/friend-requests/send?toNickname=${encodeURIComponent(nickname)}`, {
    method: "POST",
  });
  await ensureOk(res);
  return res.json();
}

export async function respondToRequest(id: number, accept: boolean): Promise<void> {
  const res = await api(`/api/friend-requests/${id}/respond?accept=${accept}`, { method: "POST" });
  await ensureOk(res);
}

export async function cancelOutgoingRequest(requestId: number): Promise<void> {
  const res = await api(`/api/friend-requests/${requestId}/cancel`, { method: "DELETE" });
  await ensureOk(res);
}

/* ---------- lists / status / friends ---------- */

export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-requests/incoming");
  await ensureOk(res);
  return res.json();
}

export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-requests/outgoing");
  await ensureOk(res);
  return res.json();
}

export async function getFriendStatus(nickname: string): Promise<FriendStatusResponse> {
  const res = await api(`/api/friends/status/${encodeURIComponent(nickname)}`);
  await ensureOk(res);
  return res.json();
}

export async function removeFriend(userId: number): Promise<void> {
  const res = await api(`/api/friends/remove/${userId}`, { method: "DELETE" });
  await ensureOk(res);
}

export async function getFriends(): Promise<UserDTO[]> {
  const res = await api("/api/friends");
  await ensureOk(res);
  return res.json();
}
