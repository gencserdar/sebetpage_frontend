import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DEMO_RECIPIENT } from "./mockDemoPeople";
import type { UpdateMessage } from "./plansDemoTypes";

interface EventUpdatesProps {
  messages: UpdateMessage[];
  onSend: (text: string) => void;
}

export default function EventUpdates({ messages, onSend }: EventUpdatesProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <div className="landing-plans-demo__updates">
      <div ref={listRef} className="landing-plans-demo__updates-list indigo-scrollbar" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="landing-plans-demo__updates-empty">
            No updates yet. Say hi to the group.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.authorId === DEMO_RECIPIENT.id;
            return (
              <article
                key={message.id}
                className={`landing-plans-demo__update${
                  mine ? " landing-plans-demo__update--mine" : ""
                }`}
              >
                <p className="landing-plans-demo__update-author">{message.authorName}</p>
                <p className="landing-plans-demo__update-text">{message.text}</p>
                <time dateTime={new Date(message.createdAt).toISOString()}>
                  {new Date(message.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </article>
            );
          })
        )}
      </div>

      <form
        className="landing-plans-demo__updates-compose"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          onSend(text);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write an update as Maya..."
          autoComplete="off"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send update">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
