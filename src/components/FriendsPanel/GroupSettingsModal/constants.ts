import { MessagingGroupPermissions } from "../../../services/chatApiService";

export const permissionRows: Array<{ key: keyof MessagingGroupPermissions; label: string }> = [
  { key: "canChangePhoto", label: "Group photo" },
  { key: "canChangeDescription", label: "Description" },
  { key: "canChangeName", label: "Name" },
  { key: "canRemoveMembers", label: "Remove users" },
  { key: "canAddMembers", label: "Add users" },
];

export const emptyPermissions: MessagingGroupPermissions = {
  canChangePhoto: false,
  canChangeDescription: false,
  canChangeName: false,
  canRemoveMembers: false,
  canAddMembers: false,
};
