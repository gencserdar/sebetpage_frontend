export interface SearchResult {
  id: string;
  name: string;
  surname?: string;
  nickname: string;
  type: "USER" | "GROUP";
  mutualFriendCount: number;
  profileImageUrl?: string;
}


export interface SearchResponse {
  users: SearchResult[];
  groups: SearchResult[];
}
