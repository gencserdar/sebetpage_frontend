/** Profile/settings palette — shared across the app. */

export const APP_BG = "#08080a";
export const APP_SURFACE = "#101018";

export const appPageClass =
  "relative flex min-h-screen flex-col overflow-x-hidden bg-app-bg text-white";

export const appSurfaceCardClass =
  "rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl";

export const appModalShellClass =
  "rounded-2xl border border-white/15 bg-app-surface/95 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl";

export const appShellClass = "bg-app-surface/95 text-white backdrop-blur-xl";

export const appShellHeaderClass = "border-b border-white/10 bg-black/20";

export const appIconBtnClass =
  "rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white";

export const appInputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-500/40";

export const appDropdownClass =
  "rounded-xl border border-white/10 bg-app-surface shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl";

export const appTabActiveClass =
  "border-b-2 border-indigo-400 bg-white/[0.06] text-white";

export const appTabInactiveClass =
  "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300";

export const appGradientHeadingClass =
  "bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-200 bg-clip-text text-transparent";

export const appGradientBtnClass =
  "bg-gradient-to-r from-indigo-500 to-violet-500 transition hover:opacity-90";

export const appBackdropClass = "bg-black/55 backdrop-blur-sm";
