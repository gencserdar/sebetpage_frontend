import type { ReactNode } from "react";
import { MessagingGroup } from "../../../services/chatApiService";
import { WsMessageDTO } from "../../../types/WSMessageDTO";

export interface FriendChatProps {
  meEmail: string;
  meNickname: string;
  friendUserId: number;
  friendEmail: string;
  friendNickname: string;
  onClose: () => void;
  onRemoved?: () => void;
  unreadCount?: number;
  onMarkAsRead?: (conversationId: number) => void;
  expandedRail?: ReactNode;
  initialExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onGroupCreated?: (
    group: MessagingGroup,
    participants: { id: number; nickname: string }[]
  ) => void;
}

export type RenderItem =
  | { type: "sep"; key: string; label: string }
  | { type: "msg"; key: string; data: WsMessageDTO };
