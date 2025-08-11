// src/App.tsx
import { useState, useEffect } from "react";
import MainRouter from "./MainRouter";
import { ChatSocketProvider } from "./context/ChatSocketContext";

export default function App() {
  useEffect(() => {
    // Any app initialization logic can go here
  }, []);

  return (
    <ChatSocketProvider>
      <MainRouter />
    </ChatSocketProvider>
  );
}