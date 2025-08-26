// src/context/ChatSocketContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useChatSocket } from '../hooks/useWebSocket';
import { useUser } from './UserContext';

// Re-export Page type for components that need it
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

// Define the context type with all the functions from useChatSocket
type ChatSocketContextType = ReturnType<typeof useChatSocket>;

const ChatSocketContext = createContext<ChatSocketContextType | null>(null);

interface ChatSocketProviderProps {
  children: ReactNode;
}

export function ChatSocketProvider({ children }: ChatSocketProviderProps) {
  const { user } = useUser();
  const chatSocket = useChatSocket(user?.email || "");

  return (
    <ChatSocketContext.Provider value={chatSocket}>
      {children}
    </ChatSocketContext.Provider>
  );
}

// Custom hook to use the chat socket context
export function useChatSocketContext() {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error('useChatSocketContext must be used within a ChatSocketProvider');
  }
  return context;
}