export type SettingsSection = "profile" | "account" | "blocked";

export const SETTINGS_SECTIONS: {
  id: SettingsSection;
  label: string;
  description: string;
}[] = [
  { id: "profile", label: "Profile", description: "Bio, links & appearance" },
  { id: "account", label: "Account", description: "Email, password & security" },
  { id: "blocked", label: "Blocked", description: "Manage blocked users" },
];
