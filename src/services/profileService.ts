import { api } from "./apiService";

export interface FieldUpdateResponse {
  field: string;
  value: string;
}

// All profile mutations moved under the new gateway's /api/user/* routes.
// The old monolith exposed them under /api/profile/* — those paths 404 now.

export const getCurrentUser = async () => {
  const res = await api("/api/user/me");
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // UserDTO
};

export const uploadPhoto = async (file: File): Promise<FieldUpdateResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api("/api/user/profile-photo", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  // The gateway returns `{ profileImageUrl: <url> }`. Flatten to the
  // legacy FieldUpdateResponse shape so callers reading response.value
  // (ProfilePopup.handlePhotoUpload) keep working — without this the
  // optimistic update writes `undefined` into profileImageUrl and the
  // own-profile preview shows the default avatar until the WS push
  // re-synchronises (and even then only when other tabs / sessions
  // receive the entity-updated frame).
  const data = await res.json();
  return { field: "profileImageUrl", value: data.profileImageUrl };
};

/* ---------- email change (two-step, code sent to NEW email) ---------- */

export const requestEmailChange = async (newEmail: string): Promise<void> => {
  const res = await api(`/api/user/request-email-change?newEmail=${encodeURIComponent(newEmail)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
};

export const confirmEmailChange = async (code: string): Promise<FieldUpdateResponse> => {
  const res = await api(`/api/user/confirm-email-change?code=${encodeURIComponent(code)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateNameSurname = async (
  name: string,
  surname: string
): Promise<FieldUpdateResponse[]> => {
  const res = await api(
    `/api/user/update-name-surname?name=${encodeURIComponent(name)}&surname=${encodeURIComponent(surname)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(await res.text());
  // Gateway returns { name, surname } as a map; flatten to the legacy
  // FieldUpdateResponse[] shape so existing callers don't need to change.
  const data = await res.json();
  return [
    { field: "name", value: data.name },
    { field: "surname", value: data.surname },
  ];
};

export const updateNickname = async (nickname: string): Promise<FieldUpdateResponse> => {
  const res = await api(`/api/user/change-nickname?newNickname=${encodeURIComponent(nickname)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ---------- password change (two-step, code sent to CURRENT email) ----- */

export const requestPasswordChange = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const res = await api("/api/user/request-password-change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error(await res.text());
};

export const confirmPasswordChange = async (code: string): Promise<void> => {
  const res = await api(`/api/user/confirm-password-change?code=${encodeURIComponent(code)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
};
