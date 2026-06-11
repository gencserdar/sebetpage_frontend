import { MessagingGroupDetail } from "../../../services/chatApiService";

export interface GroupSettingsModalProps {
  groupId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged?: (detail: MessagingGroupDetail) => void;
  onDeleted?: (groupId: number) => void;
}
