import type { WsMessageDTO } from "../../../types/WSMessageDTO";

export const PAGE_SIZE = 50;

export function normalizeWsMessage(raw: any): WsMessageDTO {
  return {
    id: String(raw.id),
    senderId: Number(raw.senderId),
    conversationId: Number(raw.conversationId),
    content: raw.content ?? "",
    createdAt: raw.createdAt,
    createdAtMillis:
      raw.createdAtMillis != null && raw.createdAtMillis !== ""
        ? Number(raw.createdAtMillis)
        : undefined,
    editedAt:
      raw.editedAt ??
      (raw.editedAtMillis != null && raw.editedAtMillis !== ""
        ? new Date(Number(raw.editedAtMillis)).toISOString()
        : undefined),
    deleted: Boolean(raw.deleted),
  };
}

export function isToday(d: Date) {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear()
  ) {
    return "Yesterday";
  }
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function getMutationMessageId(raw: any): string {
  return String(raw?.messageId ?? raw?.message?.id ?? raw?.id ?? "");
}

export function getMessageCreatedAtMillis(message: { createdAt: string; createdAtMillis?: number }) {
  if (typeof message.createdAtMillis === "number" && Number.isFinite(message.createdAtMillis)) {
    return message.createdAtMillis;
  }
  const parsed = new Date(message.createdAt).getTime();
  if (!Number.isFinite(parsed)) {
    throw new Error("Message is missing a valid createdAt timestamp");
  }
  return parsed;
}
