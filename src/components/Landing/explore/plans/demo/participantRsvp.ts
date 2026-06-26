import { DEMO_HOST, DEMO_INVITEES, DEMO_RECIPIENT } from "./mockDemoPeople";
import type { ParticipantRsvp } from "./plansDemoTypes";

const inviteeById = new Map(DEMO_INVITEES.map((person) => [person.id, person]));

export type InviteeParticipant = {
  kind: "invitee";
  id: string;
  name: string;
  avatar: string;
  role: string;
  rsvp: ParticipantRsvp;
};

export type HostParticipant = {
  kind: "host";
  id: string;
  name: string;
  avatar: string;
  role: string;
};

export function demoParticipantRsvp(personId: string, eventId: string): ParticipantRsvp {
  if (personId === DEMO_RECIPIENT.id) return "accepted";

  let hash = 0;
  const key = `${eventId}:${personId}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return hash % 100 < 65 ? "accepted" : "rejected";
}

export function getEventInvitees(eventId: string, invitedIds: string[]): InviteeParticipant[] {
  return invitedIds
    .map((id) => {
      const person = inviteeById.get(id);
      if (!person) return null;
      return {
        kind: "invitee" as const,
        ...person,
        rsvp: demoParticipantRsvp(id, eventId),
      };
    })
    .filter((person): person is InviteeParticipant => person !== null);
}

export function getEventHost(): HostParticipant {
  return {
    kind: "host",
    id: DEMO_HOST.id,
    name: DEMO_HOST.name,
    avatar: DEMO_HOST.avatar,
    role: "Organizer",
  };
}

export function getAcceptedInviteeCount(eventId: string, invitedIds: string[]): number {
  return getEventInvitees(eventId, invitedIds).filter((person) => person.rsvp === "accepted")
    .length;
}

export function getParticipantTabBadgeCount(eventId: string, invitedIds: string[]): number {
  return getAcceptedInviteeCount(eventId, invitedIds) + 1;
}
