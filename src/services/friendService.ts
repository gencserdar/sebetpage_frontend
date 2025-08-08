import { api } from "./apiService";
import { FriendRequest } from "../types/friendRequestType";
import { FriendStatusResponse } from "../types/FriendStatusResponseType";
import { UserDTO } from "../types/userDTO";

// İstek gönder
export async function sendFriendRequest(nickname: string) {
  const res = await api(`/api/friend-request/send/${nickname}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

// Gelen istekleri al
export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-request/incoming");
  if (!res.ok) throw new Error("Failed to fetch incoming requests");
  return await res.json();
}

// Giden istekleri al
export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-request/outgoing");
  if (!res.ok) throw new Error("Failed to fetch outgoing requests");
  return await res.json();
}

// İstek yanıtla
export async function respondToRequest(id: number, accept: boolean) {
  const res = await api(`/api/friend-request/respond?requestId=${id}&accept=${accept}`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Something went wrong: " + err);
  }
}

// Arkadaşlık durumunu getir (örnek: "received", "sent", "friends", "none")
export async function getFriendStatus(nickname: string): Promise<FriendStatusResponse> {
  const res = await api(`/api/friends/status/${nickname}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

// Arkadaş sil
export async function removeFriend(userId: number): Promise<void> {
  const res = await api(`/api/friends/remove/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

// Arkadaş listesini getir
export async function getFriends(): Promise<UserDTO[]> {
  const res = await api("/api/friends");

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error("Failed to fetch friends: " + errorText);
  }

  return await res.json();
}
