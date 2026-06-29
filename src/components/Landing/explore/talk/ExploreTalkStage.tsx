import { Headphones, Mic2, Moon } from "lucide-react";
import { useState, type CSSProperties } from "react";

import TalkRoomPreview from "./TalkRoomPreview";
import { MOCK_VOICE_ROOMS } from "./mockVoiceRooms";

const ROOM_ICONS = {
  gaming: Headphones,
  study: Moon,
  "open-mic": Mic2,
} as const;

export default function ExploreTalkStage({ subtitle }: { subtitle: string }) {
  const [activeRoomId, setActiveRoomId] = useState(MOCK_VOICE_ROOMS[0].id);
  const activeRoom =
    MOCK_VOICE_ROOMS.find((room) => room.id === activeRoomId) ?? MOCK_VOICE_ROOMS[0];

  return (
    <div className="landing-talk">
      <div className="landing-talk__story">
        <div className="landing-talk__story-copy">
          <h2 className="landing-talk__title">
            <span className="landing-talk__title-accent">Talk like</span>
            <span className="landing-talk__title-main"> you&apos;re there.</span>
          </h2>
          <p className="landing-talk__text">{subtitle}</p>
        </div>

        <div className="landing-talk__picker" role="listbox" aria-label="Voice room types">
          <p className="landing-talk__picker-label">Pick a room vibe</p>
          {MOCK_VOICE_ROOMS.map((room, index) => {
            const Icon = ROOM_ICONS[room.id as keyof typeof ROOM_ICONS] ?? Mic2;
            const selected = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`landing-talk__room-card${
                  selected ? " landing-talk__room-card--active" : ""
                }`}
                style={
                  {
                    "--room-accent": room.accent,
                    "--room-enter-delay": `${0.52 + index * 0.24}s`,
                  } as CSSProperties
                }
                onClick={() => setActiveRoomId(room.id)}
              >
                <span className="landing-talk__room-card-icon" aria-hidden>
                  <Icon size={17} />
                </span>
                <span className="landing-talk__room-card-copy">
                  <strong>{room.name}</strong>
                  <small>{room.tagline}</small>
                </span>
                <span className="landing-talk__room-card-live">{room.liveLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="landing-talk__showcase"
        aria-label="Voice room preview"
        style={
          {
            "--room-accent": activeRoom.accent,
            "--showcase-enter-delay": "1.34s",
          } as CSSProperties
        }
      >
        <div className="landing-talk__showcase-glow" aria-hidden />
        <TalkRoomPreview room={activeRoom} />
      </div>
    </div>
  );
}
