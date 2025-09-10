import {api} from "./apiService";
import { useAuth } from "../context/AuthContext";

export const getAccessToken = () => localStorage.getItem("token");

export const setAccessToken = (token: string) =>
  localStorage.setItem("token", token);

export const removeAccessToken = () =>
  localStorage.removeItem("token");

export function isLoggedIn(): boolean {
  const token = localStorage.getItem("token");
  return !!token; 
}

export async function logout() {
  try {
    // her ihtimale karşı önce lokal token'ı sil
    localStorage.removeItem("token");

    const res = await api("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Başarısızsa bile throw etme; logla geç
    if (!res.ok) {
      const txt = await res.text();
      console.warn("Logout not ok:", txt);
    }
  } catch (err) {
    console.warn("Logout request failed:", err);
  }
}

export async function login(email: string, password: string, rememberMe: boolean): Promise<boolean> {
  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const data = await res.json();
    const token = data.token || data.accessToken;
    if (!token) throw new Error("No token returned");

    localStorage.setItem("token", token);
    
    return true;
  } catch (err) {
    console.error("Login error:", err);
    throw err;
  }
}

export async function register(
  name: string,
  surname: string,
  email: string,
  password: string,
  nickname: string
): Promise<boolean> {
  try {
    const res = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, surname, email, password, nickname }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    let data: any;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { message: text };
    }

    const token = data.token || data.accessToken;
    if (!token) {
      console.log(data.message || "Registration successful");
      return true; 
    }

    localStorage.setItem("token", token);
    return true;
  } catch (err) {
    console.error("Register error:", err);
    throw err;
  }
}

export async function forgotPassword(email: string): Promise<boolean> {
  try {
    const res = await api(`/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
      method: "POST"
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return true;
  } catch (err) {
    console.error("Forgot password error:", err);
    throw err;
  }
}

export async function resetPassword(code: string, newPassword: string): Promise<boolean> {
  try {
    const res = await api(`/api/auth/reset-password?code=${encodeURIComponent(code)}&newPassword=${encodeURIComponent(newPassword)}`, {
      method: "POST"
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return true;
  } catch (err) {
    console.error("Reset password error:", err);
    throw err;
  }
}

