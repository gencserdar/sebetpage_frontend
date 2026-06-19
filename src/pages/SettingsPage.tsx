import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AppAmbientGlow from "../components/AppAmbientGlow";
import Navbar from "../components/Navbar/Navbar";
import SettingsSidebar from "../components/Settings/SettingsSidebar";
import ProfileSettingsSection from "../components/Settings/ProfileSettingsSection";
import AccountSettingsSection from "../components/Settings/AccountSettingsSection";
import BlockedUsersSection from "../components/Settings/BlockedUsersSection";
import ContactFeedbackSection from "../components/Settings/ContactFeedbackSection";
import SessionsSection from "../components/Settings/SessionsSection";
import { SettingsSection } from "../components/Settings/types";
import { useUser } from "../context/UserContext";
import { appPageClass, appSurfaceCardClass } from "../theme/appTheme";

function isSettingsSection(value: unknown): value is SettingsSection {
  return (
    value === "profile" ||
    value === "account" ||
    value === "blocked" ||
    value === "sessions" ||
    value === "support"
  );
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
      <div className={`${appPageClass} items-center justify-center`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/?login=1" replace />;
  }

  return (
    <div className={appPageClass}>
      <AppAmbientGlow />

      <Navbar onAuthClick={() => navigate("/?login=1")} />

      <div className="relative mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
        <div className={`flex min-h-[calc(100vh-10rem)] min-w-0 flex-col overflow-hidden lg:flex-row ${appSurfaceCardClass}`}>
          <SettingsSidebar active={section} onSelect={setSection} />

          <main className="indigo-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-black/30 p-4 sm:p-6 lg:p-10 [scrollbar-gutter:stable]">
            {section === "profile" && <ProfileSettingsSection />}
            {section === "account" && <AccountSettingsSection />}
            {section === "sessions" && <SessionsSection />}
            {section === "blocked" && <BlockedUsersSection />}
            {section === "support" && <ContactFeedbackSection />}
          </main>
        </div>
      </div>
    </div>
  );
}
