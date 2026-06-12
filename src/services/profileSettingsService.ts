import { api } from "./apiService";
import { ProfileCardLayout, ProfileWidget } from "../components/ProfileCard/types";
import { ProfileBasics, SocialLink } from "../components/Profile/types";

export interface ProfileSettingsDTO {
  userId: number;
  bio: string;
  socialLinks: SocialLink[];
  profileCard: ProfileCardLayout;
}

export interface UpdateProfileSettingsPayload {
  bio: string;
  socialLinks: SocialLink[];
  profileCard: ProfileCardLayout;
}

export async function getProfileSettings(userId: number): Promise<ProfileSettingsDTO> {
  const response = await api(`/api/user/${userId}/profile-settings`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Profile settings not found");
    }
    throw new Error("Failed to fetch profile settings");
  }

  const data = (await response.json()) as ProfileSettingsDTO;
  return {
    userId: data.userId,
    bio: data.bio ?? "",
    socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
    profileCard: normalizeProfileCard(data.profileCard),
  };
}

export async function updateProfileSettings(
  payload: UpdateProfileSettingsPayload
): Promise<ProfileSettingsDTO> {
  const response = await api("/api/user/profile-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save profile settings");
  }

  const data = (await response.json()) as ProfileSettingsDTO;
  return {
    userId: data.userId,
    bio: data.bio ?? "",
    socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
    profileCard: normalizeProfileCard(data.profileCard),
  };
}

function normalizeProfileCard(card: ProfileCardLayout | undefined): ProfileCardLayout {
  if (!card || !Array.isArray(card.widgets)) {
    return { widgets: [] };
  }
  return { widgets: card.widgets as ProfileWidget[] };
}
