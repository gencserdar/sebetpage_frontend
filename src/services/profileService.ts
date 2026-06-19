import { api } from "./apiService";

export interface FieldUpdateResponse {
  field: string;
  value: string;
}

export const uploadPhoto = async (file: File): Promise<FieldUpdateResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api("/api/user/profile-photo", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { field: "profileImageUrl", value: data.profileImageUrl };
};

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

export const freezeAccount = async (): Promise<void> => {
  const res = await api("/api/user/freeze", { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
};

export const deleteAccount = async (): Promise<void> => {
  const res = await api("/api/user/account", { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
};

export const unfreezeAccount = async (): Promise<void> => {
  const res = await api("/api/user/unfreeze", { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
};
