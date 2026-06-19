export type SettingsSection = "profile" | "account" | "blocked" | "sessions" | "support";

export const SETTINGS_SECTIONS: {
  id: SettingsSection;
  label: string;
  description: string;
}[] = [
  { id: "profile", label: "Profile", description: "Bio, links & appearance" },
  { id: "account", label: "Account", description: "Email, password & security" },
  { id: "sessions", label: "Sessions", description: "Active devices & sign-in" },
  { id: "blocked", label: "Blocked", description: "Manage blocked users" },
  { id: "support", label: "Support", description: "Contact & feedback" },
];
