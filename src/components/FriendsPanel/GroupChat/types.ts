import type { ReactNode } from "react";
import { MessagingGroupDetail } from "../../../services/chatApiService";
import { WsMessageDTO } from "../../../types/WSMessageDTO";

export interface GroupParticipant {
  id: number;
  nickname: string;
}

export interface GroupChatProps {
  conversationId: number;
  title: string;
  myUserId: number;
  myNickname: string;
  initialParticipants?: GroupParticipant[];
  onClose: () => void;
  onGroupChanged?: (detail: MessagingGroupDetail) => void;
  onGroupDeleted?: (groupId: number) => void;
  expandedRail?: ReactNode;
  initialExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export type GroupRenderItem =
  | { type: "sep"; key: string; label: string }
  | { type: "msg"; key: string; data: WsMessageDTO };
