export type InviteStatus = "pending" | "accepted" | "declined";

export type DemoEvent = {
  id: string;
  title: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  location: string;
  description: string;
  invitedIds: string[];
  status: InviteStatus;
  createdAt: number;
  isExiting?: boolean;
};

export type GalleryPhoto = {
  id: string;
  url: string;
  authorId: string;
  authorName: string;
  createdAt: number;
};

export type UpdateMessage = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
};

export type EventDetailTab = "details" | "participants" | "gallery" | "updates";

export type ParticipantRsvp = "accepted" | "rejected";

export function dateKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatEventDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
