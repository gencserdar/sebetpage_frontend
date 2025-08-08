import { SearchResponse } from "../types/searchTypes";
import { api } from "./apiService";

export async function searchUsersAndGroups(query: string): Promise<SearchResponse> {
  const response = await api(`/api/search?keyword=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return await response.json();
}
