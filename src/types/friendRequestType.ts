import { UserDTO } from "./userDTO";

export interface FriendRequest {
  id: number;
  fromUser: UserDTO;
  toUser: UserDTO;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  sentAt: string; // ISO timestamp string
}
