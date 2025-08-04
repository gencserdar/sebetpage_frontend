import { api } from "./apiService";

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
