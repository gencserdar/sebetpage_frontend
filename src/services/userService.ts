import { api } from "./apiService";
import { UserDTO } from "../types/userDTO"

export interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  fullName?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await api("/api/user/me");

    if (!res.ok) {
      return null; // token yok, geçersiz veya kullanıcı giriş yapmamış
    }

    return await res.json();
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

export const getUserByNickname = async (nickname: string): Promise<UserDTO> => {
  const token = localStorage.getItem("token");
  
  const response = await api(`/api/user/profile/${nickname}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found');
    }
    throw new Error('Failed to fetch user profile');
  }

  return response.json();
};


