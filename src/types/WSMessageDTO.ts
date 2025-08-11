export interface WsMessageDTO {  // server'dan gelen decrypt edilmiş DTO
  id: number;
  senderId: number;
  conversationId: number;
  content: string;
  createdAt: string;
}