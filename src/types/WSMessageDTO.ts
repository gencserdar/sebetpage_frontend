export interface WsMessageDTO {  // server'dan gelen decrypt edilmiş DTO
  id: number;
  senderId: number;
  conversationId: number;
  content: string;
  createdAt: string;
  /** Authoritative Cassandra clustering key — prefer over parsing createdAt ISO. */
  createdAtMillis?: number;
  editedAt?: string;
  deleted?: boolean;
}