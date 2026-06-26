import { ArrowLeft, Check, MapPin, Clock } from "lucide-react";
import { useState } from "react";

import { DEMO_INVITEES } from "./mockDemoPeople";
import { formatEventDate } from "./plansDemoTypes";

interface EventCreateFormProps {
  selectedDate: Date;
  onBack: () => void;
  onCreate: (payload: {
    title: string;
    time: string;
    location: string;
    description: string;
    invitedIds: string[];
  }) => void;
}

export default function EventCreateForm({
  selectedDate,
  onBack,
  onCreate,
}: EventCreateFormProps) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [invitedIds, setInvitedIds] = useState<string[]>([DEMO_INVITEES[0].id]);

  const toggleInvitee = (id: string) => {
    setInvitedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const canSubmit = title.trim().length > 0 && location.trim().length > 0 && invitedIds.length > 0;

  return (
    <form
      className="landing-plans-demo__create"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onCreate({
          title: title.trim(),
          time,
          location: location.trim(),
          description: description.trim(),
          invitedIds,
        });
      }}
    >
      <div className="landing-plans-demo__create-top">
        <button
          type="button"
          className="landing-plans-demo__back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <button
          type="submit"
          className="landing-plans-demo__primary-btn landing-plans-demo__primary-btn--compact landing-plans-demo__create-submit"
          disabled={!canSubmit}
        >
          Create event
        </button>
      </div>

      <div className="landing-plans-demo__create-body indigo-scrollbar">
        <div className="landing-plans-demo__create-head">
          <p className="landing-plans-demo__panel-label">New event</p>
          <h3 className="landing-plans-demo__create-title">{formatEventDate(selectedDate)}</h3>
        </div>

        <label className="landing-plans-demo__field">
        <span>Event name</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Game night, rooftop dinner..."
          autoComplete="off"
        />
      </label>

      <div className="landing-plans-demo__create-meta">
        <div className="landing-plans-demo__create-meta-primary">
          <label className="landing-plans-demo__field landing-plans-demo__field--time">
            <span>
              <Clock size={13} aria-hidden />
              Time
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label className="landing-plans-demo__field landing-plans-demo__field--location">
            <span>
              <MapPin size={13} aria-hidden />
              Location
            </span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Cafe, park, Sebetpage..."
              autoComplete="off"
            />
          </label>
        </div>
        <label className="landing-plans-demo__field landing-plans-demo__field--notes">
          <span>Extra notes</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bring snacks, dress warm, etc."
            rows={3}
          />
        </label>
      </div>

      <div className="landing-plans-demo__invitees">
        <p className="landing-plans-demo__invitees-label">Members</p>
        <div className="landing-plans-demo__invitees-list">
          {DEMO_INVITEES.map((person) => {
            const selected = invitedIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                className={`landing-plans-demo__invitee${
                  selected ? " landing-plans-demo__invitee--selected" : ""
                }`}
                onClick={() => toggleInvitee(person.id)}
                aria-pressed={selected}
              >
                <img src={person.avatar} alt="" />
                <span className="landing-plans-demo__invitee-copy">
                  <strong>{person.name}</strong>
                  <small>{person.role}</small>
                </span>
                {selected ? <Check size={14} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </form>
  );
}
