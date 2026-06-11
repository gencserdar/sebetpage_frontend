import MainRouter from "./MainRouter";
import { ChatSocketProvider } from "./context/ChatSocketContext";

export default function App() {
  return (
    <ChatSocketProvider>
      <MainRouter />
    </ChatSocketProvider>
  );
}
