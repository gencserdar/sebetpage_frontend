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

// İstek gönder - now returns response with status and requestId
export async function sendFriendRequest(nickname: string): Promise<{ status: string; requestId?: number }> {
  const res = await api(`/api/friend-request/send/${encodeURIComponent(nickname)}`, {
    method: "POST",
  });
  await ensureOk(res);
  return res.json(); // Returns { status: "sent", requestId: number } or { status: "friends" }
}

// İstek yanıtla
export async function respondToRequest(id: number, accept: boolean): Promise<void> {
  const qs = new URLSearchParams({ requestId: String(id), accept: String(accept) });
  const res = await api(`/api/friend-request/respond?${qs.toString()}`, { method: "POST" });
  await ensureOk(res);
}

// Giden isteği iptal et (ID ile)
export async function cancelOutgoingRequest(requestId: number): Promise<void> {
  const res = await api(`/api/friend-request/cancel/${requestId}`, { method: "DELETE" });
  await ensureOk(res);
}

/* ---------- lists / status / friends ---------- */

// Gelen istekler
export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-request/incoming");
  await ensureOk(res);
  return res.json();
}

// Giden istekler
export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-request/outgoing");
  await ensureOk(res);
  return res.json();
}

// Arkadaşlık durumu (received | sent | friends | none)
export async function getFriendStatus(nickname: string): Promise<FriendStatusResponse> {
  const res = await api(`/api/friends/status/${encodeURIComponent(nickname)}`);
  await ensureOk(res);
  return res.json();
}

// Arkadaş sil
export async function removeFriend(userId: number): Promise<void> {
  const res = await api(`/api/friends/remove/${userId}`, { method: "DELETE" });
  await ensureOk(res);
}

// Arkadaş listesi
export async function getFriends(): Promise<UserDTO[]> {
  const res = await api("/api/friends");
  await ensureOk(res);
  return res.json();
}
