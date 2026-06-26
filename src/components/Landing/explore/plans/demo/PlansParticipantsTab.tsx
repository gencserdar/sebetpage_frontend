import { useMemo } from "react";

import {
  getAcceptedInviteeCount,
  getEventHost,
  getEventInvitees,
} from "./participantRsvp";
import type { DemoEvent } from "./plansDemoTypes";

export default function PlansParticipantsTab({ event }: { event: DemoEvent }) {
  const host = useMemo(() => getEventHost(), []);
  const invitees = useMemo(
    () => getEventInvitees(event.id, event.invitedIds),
    [event.id, event.invitedIds],
  );

  const acceptedCount = useMemo(
    () => getAcceptedInviteeCount(event.id, event.invitedIds),
    [event.id, event.invitedIds],
  );
  const rejectedCount = invitees.length - acceptedCount;

  return (
    <div className="landing-plans-demo__participants">
      <p className="landing-plans-demo__participants-summary">
        <span>{acceptedCount} accepted</span>
        {rejectedCount > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>{rejectedCount} rejected</span>
          </>
        ) : null}
      </p>

      <ul className="landing-plans-demo__participants-list indigo-scrollbar">
        <li className="landing-plans-demo__participant landing-plans-demo__participant--host">
          <img
            className="landing-plans-demo__participant-avatar"
            src={host.avatar}
            alt=""
          />
          <div className="landing-plans-demo__participant-copy">
            <p className="landing-plans-demo__participant-name">{host.name}</p>
          </div>
          <span className="landing-plans-demo__participant-rsvp landing-plans-demo__participant-rsvp--host">
            Host
          </span>
        </li>

        {invitees.map((person) => (
          <li key={person.id} className="landing-plans-demo__participant">
            <img
              className="landing-plans-demo__participant-avatar"
              src={person.avatar}
              alt=""
            />
            <div className="landing-plans-demo__participant-copy">
              <p className="landing-plans-demo__participant-name">{person.name}</p>
            </div>
            <span
              className={`landing-plans-demo__participant-rsvp landing-plans-demo__participant-rsvp--${person.rsvp}`}
            >
              {person.rsvp === "accepted" ? "Accepted" : "Rejected"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
