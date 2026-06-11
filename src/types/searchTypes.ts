export interface SearchResult {
  id: string;
  name: string;
  surname?: string;
  nickname: string;
  type: "USER" | "COMMUNITY";
  mutualFriendCount: number;
  profileImageUrl?: string;
}

export interface SearchResponse {
  users: SearchResult[];
  communities: SearchResult[];
}
