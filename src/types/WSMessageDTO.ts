export interface WsMessageDTO {  // server'dan gelen decrypt edilmiş DTO
  /** String — snowflake-style ids exceed JS Number.MAX_SAFE_INTEGER. */
  id: string;
  senderId: number;
  conversationId: number;
  content: string;
  createdAt: string;
  /** Authoritative Cassandra clustering key — prefer over parsing createdAt ISO. */
  createdAtMillis?: number;
  editedAt?: string;
  deleted?: boolean;
}
