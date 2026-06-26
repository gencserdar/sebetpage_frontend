import { CalendarDays, Clock, MapPin } from "lucide-react";

import { DEMO_HOST, DEMO_RECIPIENT } from "./mockDemoPeople";
import type { DemoEvent } from "./plansDemoTypes";

interface InviteInboxProps {
  events: DemoEvent[];
  enteringId: string | null;
  onAccept: (eventId: string) => void;
  onDecline: (eventId: string) => void;
  onOpenEvent: (eventId: string) => void;
}

export default function InviteInbox({
  events,
  enteringId,
  onAccept,
  onDecline,
  onOpenEvent,
}: InviteInboxProps) {
  return (
    <div className="landing-plans-demo__inbox">
      <div className="landing-plans-demo__inbox-head">
        <img
          className="landing-plans-demo__inbox-avatar"
          src={DEMO_RECIPIENT.avatar}
          alt=""
        />
        <div>
          <p className="landing-plans-demo__panel-label">Maya&apos;s inbox</p>
          <p className="landing-plans-demo__inbox-sub">
            See how invites land for your friends
          </p>
        </div>
      </div>

      <div className="landing-plans-demo__inbox-body indigo-scrollbar">
        {events.length === 0 ? (
          <div className="landing-plans-demo__inbox-empty">
            <CalendarDays size={18} aria-hidden />
            <p>Invite Maya to an event above to see it land here.</p>
          </div>
        ) : (
          <div className="landing-plans-demo__inbox-list">
            {events.map((event) => (
              <article
                key={event.id}
                className={`landing-plans-demo__invite-card${
                  event.id === enteringId ? " landing-plans-demo__invite-card--entering" : ""
                }${event.isExiting ? " landing-plans-demo__invite-card--exiting" : ""}${
                  event.status === "accepted" ? " landing-plans-demo__invite-card--accepted" : ""
                }${event.status === "declined" ? " landing-plans-demo__invite-card--declined" : ""}`}
              >
                <button
                  type="button"
                  className="landing-plans-demo__invite-main"
                  onClick={() => {
                    if (event.status === "accepted" && !event.isExiting) {
                      onOpenEvent(event.id);
                    }
                  }}
                  disabled={event.status !== "accepted" || event.isExiting}
                >
                  <div className="landing-plans-demo__invite-top">
                    <img src={DEMO_HOST.avatar} alt="" />
                    <div className="landing-plans-demo__invite-copy">
                      <p className="landing-plans-demo__invite-from">
                        From <strong>{DEMO_HOST.name}</strong>
                      </p>
                      <h4>{event.title}</h4>
                    </div>
                  </div>

                  <ul className="landing-plans-demo__invite-meta">
                    <li>
                      <CalendarDays size={11} aria-hidden />
                      <span>{event.dateLabel}</span>
                    </li>
                    <li>
                      <Clock size={11} aria-hidden />
                      <span>{event.time}</span>
                    </li>
                    <li>
                      <MapPin size={11} aria-hidden />
                      <span>{event.location}</span>
                    </li>
                  </ul>

                  {event.description ? (
                    <p className="landing-plans-demo__invite-desc">{event.description}</p>
                  ) : null}

                  {event.status === "accepted" && !event.isExiting ? (
                    <p className="landing-plans-demo__invite-hint">Tap to open →</p>
                  ) : null}
                </button>

                {event.status === "pending" && !event.isExiting ? (
                  <div className="landing-plans-demo__invite-actions">
                    <button
                      type="button"
                      className="landing-plans-demo__ghost-btn landing-plans-demo__ghost-btn--compact"
                      onClick={() => onDecline(event.id)}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="landing-plans-demo__primary-btn landing-plans-demo__primary-btn--compact"
                      onClick={() => onAccept(event.id)}
                    >
                      Accept
                    </button>
                  </div>
                ) : null}

                {event.status === "accepted" && !event.isExiting ? (
                  <p className="landing-plans-demo__invite-status landing-plans-demo__invite-status--accepted">
                    Accepted — tap card to open
                  </p>
                ) : null}

                {event.status === "declined" && !event.isExiting ? (
                  <p className="landing-plans-demo__invite-status landing-plans-demo__invite-status--declined">
                    Declined
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
