import { getAccessToken, setAccessToken, removeAccessToken } from "./authService";

export const api = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAccessToken();

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const newToken = res.headers.get("x-new-token");
  if (newToken) {
    setAccessToken(newToken);
  }

  // ❗ Token olup olmamasına bakma; 401/403 geldiyse local state'i temizle
  if (res.status === 401 || res.status === 403) {
    removeAccessToken();
    // Uygulamayı temiz bir state'e al
    window.location.href = "/login";
    // İsteği kullanan tarafa hata ver
    throw new Error("Unauthorized");
  }

  return res;
};
