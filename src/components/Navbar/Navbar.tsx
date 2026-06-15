import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MessageSquare, Users } from "lucide-react";
import { useUser } from "../../context/UserContext";
import SearchBar from "./SearchBar";
import FriendRequestsDropdown from "./FriendRequestsDropdown";
import UserMenu from "./UserMenu";

interface NavbarProps {
  onAuthClick: () => void;
  onMessagesClick?: () => void;
  unreadCount?: number;
}

const NAV_ITEMS = [
  { label: "Friends", title: "Coming soon" },
  { label: "Explore", title: "Coming soon" },
  { label: "Community", title: "Coming soon" },
] as const;

type MobilePanel = "nav" | "requests" | "profile" | null;

function ChevronToggle({
  open,
  onClick,
  label,
  controls,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-300 transition active:bg-white/10"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
    >
      <ChevronDown
        size={20}
        className={`transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}

function MobileIconToggle({
  open,
  onClick,
  label,
  controls,
  badge,
  children,
}: {
  open?: boolean;
  onClick: () => void;
  label: string;
  controls?: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-300 transition active:bg-white/10"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function ProfileMobileToggle({
  open,
  onClick,
  label,
  controls,
  profileImageUrl,
  initials,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  controls: string;
  profileImageUrl?: string | null;
  initials: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 shrink-0 items-center rounded-xl text-gray-300 transition active:bg-white/10"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
    >
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-indigo-500/25 text-xs font-semibold text-indigo-100">
        {profileImageUrl ? (
          <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <ChevronDown
        size={18}
        className={`transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}

export default function Navbar({
  onAuthClick,
  onMessagesClick,
  unreadCount = 0,
}: NavbarProps) {
  const { user, loading } = useUser();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const panelOpen = mobilePanel !== null;

  useEffect(() => {
    if (!panelOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [panelOpen]);

  const closePanels = () => setMobilePanel(null);

  const togglePanel = (panel: Exclude<MobilePanel, null>) => {
    setMobilePanel((prev) => (prev === panel ? null : panel));
  };

  const profileInitials =
    `${user?.name?.[0] ?? ""}${user?.surname?.[0] ?? ""}`.toUpperCase() || "?";

  const mobileActivityBadge = unreadCount;

  const handleMessagesClick = () => {
    closePanels();
    onMessagesClick?.();
  };

  return (
    <header className="relative sticky top-0 z-50 border-b border-white/10 bg-app-bg">
      <div className="flex min-w-0 items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5 lg:justify-between lg:gap-0 lg:px-8 lg:py-3">
        <div className="flex min-w-0 shrink-0 items-center">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 lg:gap-2.5"
            aria-label="SebetPage home"
          >
            <img
              src="/img4.png"
              alt=""
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-14 lg:w-14"
            />
            <span className="truncate text-lg font-bold tracking-tight text-white sm:text-xl lg:text-2xl">
              SebetPage
            </span>
          </Link>

          <div className="lg:hidden">
            <ChevronToggle
              open={mobilePanel === "nav"}
              onClick={() => togglePanel("nav")}
              label="Open navigation menu"
              controls="mobile-main-nav"
            />
          </div>
        </div>

        <nav
          className="ml-10 mr-auto hidden space-x-8 text-base text-gray-500 lg:flex xl:ml-40"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ label, title }) => (
            <span key={label} className="cursor-default" title={title}>
              {label}
            </span>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 lg:gap-4">
          {user && !loading && (
            <>
              <div className="hidden items-center gap-2 md:flex lg:gap-4">
                <FriendRequestsDropdown onPendingCountChange={setPendingRequestCount} />
                <SearchBar />
                <UserMenu onAuthClick={onAuthClick} />
              </div>

              <div className="flex items-center gap-1 md:hidden">
                <MobileIconToggle
                  open={mobilePanel === "requests"}
                  onClick={() => togglePanel("requests")}
                  label="Open friend requests"
                  controls="mobile-requests-nav"
                  badge={pendingRequestCount}
                >
                  <Users size={20} aria-hidden />
                </MobileIconToggle>

                {onMessagesClick && (
                  <MobileIconToggle
                    onClick={handleMessagesClick}
                    label="Open messages"
                    badge={mobileActivityBadge}
                  >
                    <MessageSquare size={20} aria-hidden />
                  </MobileIconToggle>
                )}

                <ProfileMobileToggle
                  open={mobilePanel === "profile"}
                  onClick={() => togglePanel("profile")}
                  label="Open account menu"
                  controls="mobile-profile-nav"
                  profileImageUrl={user.profileImageUrl}
                  initials={profileInitials}
                />
              </div>
            </>
          )}

          {(!user || loading) && <UserMenu onAuthClick={onAuthClick} />}
        </div>
      </div>

      {panelOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/55 lg:hidden"
          onClick={closePanels}
        />
      )}

      {mobilePanel === "nav" && (
        <nav
          id="mobile-main-nav"
          className="relative z-50 border-t border-white/10 bg-app-bg lg:hidden"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ label, title }) => (
            <button
              key={label}
              type="button"
              title={title}
              onClick={closePanels}
              className="flex min-h-[3.25rem] w-full items-center border-b border-white/[0.06] px-5 text-left text-base text-gray-100 transition last:border-b-0 active:bg-white/10"
            >
              {label}
              <span className="ml-auto text-xs text-gray-500">Soon</span>
            </button>
          ))}
        </nav>
      )}

      {mobilePanel === "requests" && user && !loading && (
        <div
          id="mobile-requests-nav"
          className="relative z-50 max-h-[min(70vh,32rem)] overflow-y-auto border-t border-white/10 bg-app-bg lg:hidden indigo-scrollbar"
        >
          <FriendRequestsDropdown
            inline
            onNavigate={closePanels}
            onPendingCountChange={setPendingRequestCount}
          />
        </div>
      )}

      {mobilePanel === "profile" && user && !loading && (
        <div
          id="mobile-profile-nav"
          className="relative z-50 max-h-[min(70vh,32rem)] overflow-y-auto border-t border-white/10 bg-app-bg lg:hidden indigo-scrollbar"
        >
          <SearchBar embedded onResultSelect={closePanels} />
          <UserMenu inline onAuthClick={onAuthClick} onNavigate={closePanels} />
        </div>
      )}
    </header>
  );
}
