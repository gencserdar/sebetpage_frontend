import { useMemo, useState } from "react";
import SettingsSectionHeader from "./SettingsSectionHeader";

const SUPPORT_EMAIL = "jannalannister@gmail.com";

export default function ContactFeedbackSection() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const mailtoHref = useMemo(() => {
    const finalSubject = subject.trim() || "SebetPage feedback";
    const finalBody = message.trim()
      ? message.trim()
      : "Hi SebetPage team,\n\nI wanted to share the following feedback:\n\n";
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;
  }, [subject, message]);

  return (
    <div>
      <SettingsSectionHeader
        title="Contact & feedback"
        description="Send feedback, report bugs, or ask for help."
      />

      <div className="max-w-xl rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-gray-400">
          Tell us what broke, what feels confusing, or what would make the site
          better. Your email app will open with the message filled in.
        </p>

        <div className="mt-5 space-y-4">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your feedback or support request..."
            rows={7}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
          <a
            href={mailtoHref}
            className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
          >
            Open email
          </a>
        </div>

        <p className="mt-4 text-xs text-gray-600">
          Direct email: {SUPPORT_EMAIL}
        </p>
      </div>
    </div>
  );
}
