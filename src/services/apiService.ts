import { getAccessToken, setAccessToken, removeAccessToken } from "./authService";

export const api = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAccessToken();

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  // Yeni token yakala
  const newToken = res.headers.get("x-new-token");
  if (newToken) {
    console.log("New token: ", newToken);
    setAccessToken(newToken);
  }

  // Yetkisizsa logout
  if ((res.status === 401 || res.status === 403) && token) {
    removeAccessToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return res;
};
