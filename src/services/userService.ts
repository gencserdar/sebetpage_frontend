import { api } from "./apiService";
import { UserDTO } from "../types/userDTO";

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

export const getUserById = async (id: number): Promise<UserDTO> => {
  const response = await api(`/api/user/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("User not found");
    throw new Error("Failed to fetch user profile");
  }
  return response.json();
};
