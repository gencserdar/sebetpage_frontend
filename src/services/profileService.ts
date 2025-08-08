import { api } from "./apiService";

export interface FieldUpdateResponse {
  field: string;
  value: string;
}

// 📌 Kullanıcı bilgilerini çek
export const getCurrentUser = async () => {
  const res = await api("/api/user/me");
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // UserDTO
};

// 📌 Profil fotoğrafı yükleme
export const uploadPhoto = async (file: File): Promise<FieldUpdateResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api("/api/profile/upload-photo", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// 📌 Email değiştirme
export const updateEmail = async (email: string): Promise<FieldUpdateResponse> => {
  const res = await api(`/api/profile/change-email?newEmail=${encodeURIComponent(email)}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// 📌 Name & Surname değiştirme
export const updateNameSurname = async (
  name: string,
  surname: string
): Promise<FieldUpdateResponse[]> => {
  const res = await api(
    `/api/profile/change-name-surname?newName=${encodeURIComponent(name)}&newSurname=${encodeURIComponent(surname)}`,
    { method: "PUT" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// 📌 Nickname değiştirme
export const updateNickname = async (nickname: string): Promise<FieldUpdateResponse> => {
  const res = await api(`/api/profile/change-nickname?newNickname=${encodeURIComponent(nickname)}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// 📌 Şifre değiştirme
export const changePassword = async (oldPassword: string, newPassword: string) => {
  const res = await api("/api/profile/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // Authorization otomatik eklenecek
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.text();
};
