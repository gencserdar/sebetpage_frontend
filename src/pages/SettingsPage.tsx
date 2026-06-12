import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import SettingsSidebar from "../components/Settings/SettingsSidebar";
import ProfileSettingsSection from "../components/Settings/ProfileSettingsSection";
import AccountSettingsSection from "../components/Settings/AccountSettingsSection";
import BlockedUsersSection from "../components/Settings/BlockedUsersSection";
import { SettingsSection } from "../components/Settings/types";
import { useUser } from "../context/UserContext";

function isSettingsSection(value: unknown): value is SettingsSection {
  return value === "profile" || value === "account" || value === "blocked";
}

export default function SettingsPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSection = isSettingsSection(
    (location.state as { section?: unknown } | null)?.section
  )
    ? (location.state as { section: SettingsSection }).section
    : "profile";

  const [section, setSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    const fromState = (location.state as { section?: unknown } | null)?.section;
    if (isSettingsSection(fromState)) {
      setSection(fromState);
    }
  }, [location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/?login=1" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#08080a] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-20 h-[28rem] w-[28rem] rounded-full bg-indigo-600/[0.07] blur-3xl" />
        <div className="absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-violet-600/[0.06] blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/[0.03] blur-3xl" />
      </div>

      <Navbar onAuthClick={() => navigate("/?login=1")} />

      <div className="relative mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
        <div className="flex min-h-[calc(100vh-10rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:flex-row">
          <SettingsSidebar active={section} onSelect={setSection} />

          <main className="indigo-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-black/30 p-4 sm:p-6 lg:p-10 [scrollbar-gutter:stable]">
            {section === "profile" && <ProfileSettingsSection />}
            {section === "account" && <AccountSettingsSection />}
            {section === "blocked" && <BlockedUsersSection />}
          </main>
        </div>
      </div>
    </div>
  );
}
