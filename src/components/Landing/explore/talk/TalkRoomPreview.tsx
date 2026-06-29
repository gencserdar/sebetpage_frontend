import { Mic, Radio } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import type { MockVoiceRoom } from "./mockVoiceRooms";

function seatDistanceRem(count: number): string {
  if (count <= 3) return "4.85rem";
  if (count === 4) return "5.65rem";
  if (count === 5) return "6.35rem";
  return "6.85rem";
}

interface TalkRoomPreviewProps {
  room: MockVoiceRoom;
}

export default function TalkRoomPreview({ room }: TalkRoomPreviewProps) {
  const [speakingIndex, setSpeakingIndex] = useState(0);

  useEffect(() => {
    setSpeakingIndex(0);
  }, [room.id]);

  useEffect(() => {
    if (room.participants.length <= 1) return;

    const timer = window.setInterval(() => {
      setSpeakingIndex((prev) => (prev + 1) % room.participants.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [room.id, room.participants.length]);

  const count = room.participants.length;
  const seatDistance = seatDistanceRem(count);

  return (
    <div
      className="landing-talk__preview"
      style={{ "--room-accent": room.accent } as CSSProperties}
      aria-live="polite"
    >
      <div className="landing-talk__preview-head">
        <h3 className="landing-talk__preview-title">{room.name}</h3>
        <span className="landing-talk__preview-live">
          <Radio size={13} aria-hidden />
          {room.liveLabel}
        </span>
      </div>

      <p className="landing-talk__preview-tagline">{room.tagline}</p>

      <div
        className="landing-talk__orbit-wrap"
        style={{ "--seat-distance": seatDistance } as CSSProperties}
      >
        <div className="landing-talk__orbit-ring" aria-hidden />
        <ul className="landing-talk__orbit" aria-label={`${room.name} participants`}>
          {room.participants.map((person, index) => {
            const angle = (360 / count) * index - 90;
            return (
              <li
                key={person.id}
                className={`landing-talk__seat${
                  index === speakingIndex ? " landing-talk__seat--speaking" : ""
                }`}
                style={{ "--seat-angle": `${angle}deg` } as CSSProperties}
              >
                <img src={person.avatar} alt="" />
                <span>{person.name}</span>
                {index === speakingIndex ? (
                  <i className="landing-talk__seat-mic" aria-hidden>
                    <Mic size={10} />
                  </i>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="landing-talk__waveform" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="landing-talk__waveform-bar"
            style={{ "--wave-delay": `${i * 0.08}s` } as CSSProperties}
          />
        ))}
      </div>

      <Link to="/register" className="landing-talk__join-btn">
        Join room
      </Link>
    </div>
  );
}
