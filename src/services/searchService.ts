import { SearchResponse } from "../types/searchTypes";

export async function searchUsersAndGroups(query: string, token: string): Promise<SearchResponse> {
  const response = await fetch(`/api/search?keyword=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data: SearchResponse = await response.json();
  return data;
}