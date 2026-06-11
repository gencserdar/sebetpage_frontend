import { UserDTO } from "../../types/userDTO";

export interface ProfilePopupProps {
  onClose: () => void;
  user: UserDTO;
  isOwnProfile?: boolean;
}

export interface ErrorState {
  [key: string]: string | null | undefined;
  general?: string | null;
  photo?: string | null;
  password?: string | null;
  block?: string | null;
}

export type EditableField = "name" | "surname" | "nickname" | "email" | "password";
export type UserEditableField = Exclude<EditableField, "password">;

export type FriendStatus = "self" | "friends" | "sent" | "received" | "none";

export type VerifyState =
  | { kind: "email"; pendingNewEmail: string }
  | { kind: "password" }
  | null;

export type ConfirmationModalState = {
  isOpen: boolean;
  type: "removeFriend" | "block" | "unblock" | "cancelRequest";
  message: string;
  onConfirm: () => void;
} | null;
