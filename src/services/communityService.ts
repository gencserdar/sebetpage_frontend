export interface PublicCommunity {
  id: number;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: number;
  createdAtMillis: number;
  myRole?: string;
}

export async function searchPublicCommunities(
  keyword: string
): Promise<PublicCommunity[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const response = await fetch(
    `/api/communities/search?keyword=${encodeURIComponent(trimmed)}`
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Community search failed");
  }

  const rows = (await response.json()) as PublicCommunity[];
  return rows.filter((c) => !c.isPrivate);
}
