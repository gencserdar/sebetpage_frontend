import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import EventCreateForm from "./EventCreateForm";
import EventDetailPanel from "./EventDetailPanel";
import InviteInbox from "./InviteInbox";
import PlansCalendar from "./PlansCalendar";
import { DEMO_HOST, DEMO_RECIPIENT } from "./mockDemoPeople";
import {
  dateKeyFromDate,
  formatEventDate,
  type DemoEvent,
  type GalleryPhoto,
  type UpdateMessage,
} from "./plansDemoTypes";

type CreatorView = "calendar" | "create";
type InboxView = "inbox" | "detail";

const DECLINE_FADE_MS = 2000;

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PlansEventDemo() {
  const [creatorView, setCreatorView] = useState<CreatorView>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hostedEvents, setHostedEvents] = useState<DemoEvent[]>([]);
  const [mayaInvites, setMayaInvites] = useState<DemoEvent[]>([]);
  const [enteringInviteId, setEnteringInviteId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [inboxView, setInboxView] = useState<InboxView>("inbox");
  const [eventPhotos, setEventPhotos] = useState<Record<string, GalleryPhoto[]>>({});
  const [eventMessages, setEventMessages] = useState<Record<string, UpdateMessage[]>>({});
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const declineTimersRef = useRef<Map<string, number>>(new Map());

  const trackUrl = useCallback((url: string) => {
    objectUrlsRef.current.add(url);
  }, []);

  const revokeEventPhotos = useCallback((eventId: string) => {
    setEventPhotos((prev) => {
      const photos = prev[eventId] ?? [];
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.url);
        objectUrlsRef.current.delete(photo.url);
      });
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setEventMessages((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  const revokeAllUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => () => {
    revokeAllUrls();
    declineTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    declineTimersRef.current.clear();
  }, [revokeAllUrls]);

  const markedDateKeys = useMemo(() => {
    const keys = new Set<string>();
    hostedEvents.forEach((event) => keys.add(event.dateKey));
    return keys;
  }, [hostedEvents]);

  const activeEvent = useMemo(
    () => mayaInvites.find((event) => event.id === activeEventId && event.status === "accepted") ?? null,
    [activeEventId, mayaInvites],
  );

  const handleCreateEvent = (payload: {
    title: string;
    time: string;
    location: string;
    description: string;
    invitedIds: string[];
  }) => {
    if (!selectedDate) return;

    const newEvent: DemoEvent = {
      id: makeId("event"),
      title: payload.title,
      dateKey: dateKeyFromDate(selectedDate),
      dateLabel: formatEventDate(selectedDate),
      time: payload.time,
      location: payload.location,
      description: payload.description,
      invitedIds: payload.invitedIds,
      status: "pending",
      createdAt: Date.now(),
    };

    setHostedEvents((prev) => [...prev, { ...newEvent }]);
    setEventPhotos((prev) => ({ ...prev, [newEvent.id]: [] }));
    setEventMessages((prev) => ({ ...prev, [newEvent.id]: [] }));

    if (payload.invitedIds.includes(DEMO_RECIPIENT.id)) {
      setMayaInvites((prev) => [{ ...newEvent }, ...prev]);
      setEnteringInviteId(newEvent.id);
      window.setTimeout(() => setEnteringInviteId(null), 480);
    }

    setInboxView("inbox");
    setCreatorView("calendar");
    setSelectedDate(null);
  };

  const handleAccept = (eventId: string) => {
    setMayaInvites((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, status: "accepted" } : event,
      ),
    );
    setHostedEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, status: "accepted" } : event,
      ),
    );
    setEventMessages((prev) => ({
      ...prev,
      [eventId]: [
        {
          id: makeId("msg"),
          authorId: DEMO_HOST.id,
          authorName: DEMO_HOST.name,
          text: "Can't wait — thanks for joining us!",
          createdAt: Date.now(),
        },
      ],
    }));
  };

  const handleDecline = (eventId: string) => {
    if (declineTimersRef.current.has(eventId)) return;

    setMayaInvites((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? { ...event, status: "declined", isExiting: true }
          : event,
      ),
    );
    setHostedEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, status: "declined" } : event,
      ),
    );

    if (activeEventId === eventId) {
      setActiveEventId(null);
      setInboxView("inbox");
    }

    const timer = window.setTimeout(() => {
      declineTimersRef.current.delete(eventId);
      setMayaInvites((prev) => prev.filter((event) => event.id !== eventId));
      revokeEventPhotos(eventId);
    }, DECLINE_FADE_MS);

    declineTimersRef.current.set(eventId, timer);
  };

  const handleAddPhotos = (files: File[], authorId: string, authorName: string) => {
    if (!activeEventId) return;

    const added = files.map((file) => {
      const url = URL.createObjectURL(file);
      trackUrl(url);
      return {
        id: makeId("photo"),
        url,
        authorId,
        authorName,
        createdAt: Date.now(),
      } satisfies GalleryPhoto;
    });

    setEventPhotos((prev) => ({
      ...prev,
      [activeEventId]: [...(prev[activeEventId] ?? []), ...added],
    }));
  };

  const handleSendUpdate = (text: string) => {
    if (!activeEventId) return;

    setEventMessages((prev) => ({
      ...prev,
      [activeEventId]: [
        ...(prev[activeEventId] ?? []),
        {
          id: makeId("msg"),
          authorId: DEMO_RECIPIENT.id,
          authorName: DEMO_RECIPIENT.name,
          text,
          createdAt: Date.now(),
        },
      ],
    }));
  };

  return (
    <div className="landing-plans-demo" aria-label="Event planning demo">
      <div className="landing-plans-demo__creator">
        {creatorView === "calendar" ? (
          <PlansCalendar
            markedDateKeys={markedDateKeys}
            onDaySelect={(date) => {
              setSelectedDate(date);
              setCreatorView("create");
            }}
          />
        ) : selectedDate ? (
          <EventCreateForm
            selectedDate={selectedDate}
            onBack={() => {
              setCreatorView("calendar");
              setSelectedDate(null);
            }}
            onCreate={handleCreateEvent}
          />
        ) : null}
      </div>

      <div className="landing-plans-demo__split" aria-hidden />

      <div className="landing-plans-demo__recipient">
        {inboxView === "detail" && activeEvent ? (
          <EventDetailPanel
            event={activeEvent}
            photos={eventPhotos[activeEvent.id] ?? []}
            messages={eventMessages[activeEvent.id] ?? []}
            onBack={() => {
              setInboxView("inbox");
              setActiveEventId(null);
            }}
            onAddPhotos={handleAddPhotos}
            onSendUpdate={handleSendUpdate}
          />
        ) : (
          <InviteInbox
            events={mayaInvites}
            enteringId={enteringInviteId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onOpenEvent={(eventId) => {
              setActiveEventId(eventId);
              setInboxView("detail");
            }}
          />
        )}
      </div>
    </div>
  );
}
