import { api } from "./apiService";
import { FriendRequest } from "../types/friendRequestType";
import { FriendStatusResponse } from "../types/FriendStatusResponseType";


// İstek gönder
export async function sendFriendRequest(nickname: string, token: string) {
  const res = await api(`/api/friend-request/send/${nickname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}


// Gelen istekleri al
export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-request/incoming", {
    method: "GET"
  });
  return res.json();
}

// Giden istekleri al
export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  const res = await api("/api/friend-request/outgoing");
  if (!res.ok) throw new Error("Failed to fetch outgoing requests");
  return res.json();
}

export async function respondToRequest(id: number, accept: boolean) {
  const res = await api(`/api/friend-request/respond?requestId=${id}&accept=${accept}`, {
    method: 'POST',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Something went wrong: " + err);
  }
}


export async function getFriendStatus(nickname: string, token: string): Promise<FriendStatusResponse> {
  const res = await api(`/api/friends/status/${nickname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json(); // örn: { status: "received", requestId: 42 }
}

export async function removeFriend(userId: number): Promise<void> {
  const res = await api(`/api/friends/remove/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

