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

export function formatGroupLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Failed to load group";
  const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
  const lower = message.toLowerCase();

  if (lower.includes("not a participant") || lower.includes("not a member")) {
    return "You're not a member of this group. A member must add you — there is no public join link.";
  }
  if (lower.includes("conversation not found") || status === 404) {
    return "This group was deleted or no longer exists. Refresh your messages list.";
  }
  if (lower.includes("account frozen")) {
    return "Your account is frozen. Unfreeze it in settings to access groups.";
  }
  if (lower.includes("application error processing rpc") || lower.includes("rpc error")) {
    return "Could not load group settings. Try again after refreshing the page.";
  }
  if (lower.includes("not a messaging group")) {
    return "This conversation is not a group chat.";
  }
  return message;
}
