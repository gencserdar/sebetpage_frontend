import { Ban, KeyRound, Monitor, Sparkles, User, type LucideIcon } from "lucide-react";
import SettingsSidebarProfileCard from "./SettingsSidebarProfileCard";
import { SettingsSection, SETTINGS_SECTIONS } from "./types";

interface SettingsSidebarProps {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}

const SECTION_ICONS: Record<SettingsSection, LucideIcon> = {
  profile: User,
  account: KeyRound,
  sessions: Monitor,
  blocked: Ban,
};

export default function SettingsSidebar({ active, onSelect }: SettingsSidebarProps) {
  return (
    <aside className="w-full shrink-0 border-b border-white/10 bg-black/20 p-3 sm:p-4 lg:w-72 lg:border-b-0 lg:border-r lg:p-6 xl:w-80">
      <div className="hidden lg:block">
        <SettingsSidebarProfileCard />
      </div>

      <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500 lg:mb-3 lg:block">
        Preferences
      </p>

      <nav className="flex gap-1 overflow-x-auto pb-0.5 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {SETTINGS_SECTIONS.map(({ id, label, description }) => {
          const Icon = SECTION_ICONS[id];
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-200 sm:gap-3 sm:py-3 lg:w-full lg:items-start ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/5 text-white shadow-[inset_0_0_0_1px_rgba(129,140,248,0.25)]"
                  : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 lg:bottom-auto lg:left-0 lg:right-auto lg:top-1/2 lg:h-8 lg:w-1 lg:-translate-y-1/2 lg:rounded-r-full" />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-white/[0.06] text-gray-500 group-hover:bg-white/10 group-hover:text-gray-300"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 pr-1">
                <span className="block whitespace-nowrap text-sm font-medium leading-tight">
                  {label}
                </span>
                <span
                  className={`mt-0.5 hidden text-xs leading-snug sm:block lg:block ${
                    isActive ? "text-indigo-200/60" : "text-gray-600 group-hover:text-gray-500"
                  }`}
                >
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 hidden pt-4 lg:mt-auto lg:block lg:pt-8">
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-xs text-gray-600">
          <Sparkles size={14} className="shrink-0 text-violet-400/70" />
          <span>More options coming soon</span>
        </div>
      </div>
    </aside>
  );
}
