// örneğin: src/types/ChatMessage.ts
export interface ChatMessage {
  from: string;
  to: string;
  content: string;
  timestamp?: string;
}