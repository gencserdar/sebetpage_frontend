import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { dateKeyFromDate } from "./plansDemoTypes";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface PlansCalendarProps {
  markedDateKeys: Set<string>;
  onDaySelect: (date: Date) => void;
}

export default function PlansCalendar({
  markedDateKeys,
  onDaySelect,
}: PlansCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayKey = dateKeyFromDate(new Date());

  const todayStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: Array<{ date: Date | null; key: string }> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      items.push({ date: null, key: `pad-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      items.push({ date, key: dateKeyFromDate(date) });
    }

    while (items.length < 42) {
      items.push({ date: null, key: `pad-end-${items.length}` });
    }

    return items;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="landing-plans-demo__calendar">
      <div className="landing-plans-demo__calendar-head">
        <p className="landing-plans-demo__panel-label">Pick a day</p>
        <div className="landing-plans-demo__calendar-nav">
          <button
            type="button"
            className="landing-plans-demo__icon-btn"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="landing-plans-demo__calendar-month">{monthLabel}</span>
          <button
            type="button"
            className="landing-plans-demo__icon-btn"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="landing-plans-demo__calendar-weekdays" aria-hidden>
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="landing-plans-demo__calendar-grid" role="grid" aria-label={monthLabel}>
        {cells.map(({ date, key }) => {
          if (!date) {
            return <span key={key} className="landing-plans-demo__day landing-plans-demo__day--empty" />;
          }

          const isToday = key === todayKey;
          const isMarked = markedDateKeys.has(key);
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const isPast = dayStart < todayStart;

          return (
            <button
              key={key}
              type="button"
              className={`landing-plans-demo__day${
                isToday ? " landing-plans-demo__day--today" : ""
              }${isMarked ? " landing-plans-demo__day--marked" : ""}${
                isPast ? " landing-plans-demo__day--past" : ""
              }`}
              onClick={() => {
                if (!isPast) onDaySelect(date);
              }}
              disabled={isPast}
              role="gridcell"
              aria-label={date.toLocaleDateString()}
              aria-disabled={isPast}
            >
              <span>{date.getDate()}</span>
              {isMarked ? <i className="landing-plans-demo__day-dot" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
