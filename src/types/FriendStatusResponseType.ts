export interface FriendStatusResponse {
  status: "self" | "friends" | "sent" | "received" | "none";
  requestId?: number;
}