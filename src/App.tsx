import MainRouter from "./MainRouter";
import { ChatSocketProvider } from "./context/ChatSocketContext";

export default function App() {
  return (
    <ChatSocketProvider>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[9999] overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[max(50vh,28rem)] bg-app-bg" />
        <div className="absolute inset-x-0 bottom-0 h-[max(50vh,28rem)] bg-app-bg" />
      </div>
      <MainRouter />
    </ChatSocketProvider>
  );
}
