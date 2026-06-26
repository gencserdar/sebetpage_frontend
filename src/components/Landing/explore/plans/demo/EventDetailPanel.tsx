import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { useState } from "react";

import { DEMO_HOST } from "./mockDemoPeople";
import { getParticipantTabBadgeCount } from "./participantRsvp";
import EventGallery from "./EventGallery";
import PlansParticipantsTab from "./PlansParticipantsTab";
import EventUpdates from "./EventUpdates";
import type {
  DemoEvent,
  EventDetailTab,
  GalleryPhoto,
  UpdateMessage,
} from "./plansDemoTypes";

interface EventDetailPanelProps {
  event: DemoEvent;
  photos: GalleryPhoto[];
  messages: UpdateMessage[];
  onBack: () => void;
  onAddPhotos: (files: File[], authorId: string, authorName: string) => void;
  onSendUpdate: (text: string) => void;
}

const TABS: { id: EventDetailTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "participants", label: "Participants" },
  { id: "gallery", label: "Gallery" },
  { id: "updates", label: "Updates" },
];

export default function EventDetailPanel({
  event,
  photos,
  messages,
  onBack,
  onAddPhotos,
  onSendUpdate,
}: EventDetailPanelProps) {
  const [tab, setTab] = useState<EventDetailTab>("details");
  const participantBadgeCount = getParticipantTabBadgeCount(event.id, event.invitedIds);

  return (
    <div className="landing-plans-demo__detail">
      <div className="landing-plans-demo__detail-head">
        <button type="button" className="landing-plans-demo__back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to inbox
        </button>
        <h3>{event.title}</h3>
      </div>

      <div className="landing-plans-demo__tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`landing-plans-demo__tab${
              tab === item.id ? " landing-plans-demo__tab--active" : ""
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "participants" ? (
              <span className="landing-plans-demo__tab-badge">{participantBadgeCount}</span>
            ) : null}
            {item.id === "gallery" && photos.length ? (
              <span className="landing-plans-demo__tab-badge">{photos.length}</span>
            ) : null}
            {item.id === "updates" && messages.length ? (
              <span className="landing-plans-demo__tab-badge">{messages.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="landing-plans-demo__tab-panel" role="tabpanel">
        {tab === "details" ? (
          <div className="landing-plans-demo__details">
            <p className="landing-plans-demo__details-host">
              Hosted by <strong>{DEMO_HOST.name}</strong>
            </p>
            <ul>
              <li>
                <CalendarDays size={15} aria-hidden />
                {event.dateLabel}
              </li>
              <li>
                <Clock size={15} aria-hidden />
                {event.time}
              </li>
              <li>
                <MapPin size={15} aria-hidden />
                {event.location}
              </li>
            </ul>
            {event.description ? (
              <p className="landing-plans-demo__details-notes">{event.description}</p>
            ) : (
              <p className="landing-plans-demo__details-notes landing-plans-demo__details-notes--muted">
                No extra notes from the host.
              </p>
            )}
          </div>
        ) : null}

        {tab === "participants" ? <PlansParticipantsTab event={event} /> : null}

        {tab === "gallery" ? (
          <EventGallery photos={photos} onAddPhotos={onAddPhotos} />
        ) : null}

        {tab === "updates" ? (
          <EventUpdates messages={messages} onSend={onSendUpdate} />
        ) : null}
      </div>
    </div>
  );
}
