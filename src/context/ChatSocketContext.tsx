import React, { createContext, useContext, ReactNode } from "react";
import { useChatSocket } from "../hooks/useWebSocket";
import { useUser } from "./UserContext";

export type { Page } from "../types/page";

type ChatSocketContextType = ReturnType<typeof useChatSocket>;

const ChatSocketContext = createContext<ChatSocketContextType | null>(null);

interface ChatSocketProviderProps {
  children: ReactNode;
}

export function ChatSocketProvider({ children }: ChatSocketProviderProps) {
  const { user } = useUser();
  const chatSocket = useChatSocket(user && !user.frozen ? user.email : "");

  return (
    <ChatSocketContext.Provider value={chatSocket}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocketContext() {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error("useChatSocketContext must be used within a ChatSocketProvider");
  }
  return context;
}
