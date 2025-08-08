import { api } from "./apiService";
import { UserDTO } from "../types/userDTO";

export interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  fullName?: string;
}

// Me endpoint – kullanıcı oturumda mı kontrolü
export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await api("/api/user/me");
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

// Nickname ile kullanıcı bilgisi çekme
export const getUserByNickname = async (nickname: string): Promise<UserDTO> => {
  const response = await api(`/api/user/profile/${nickname}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("User not found");
    }
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
};
