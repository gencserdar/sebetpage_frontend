import { useUser } from "../context/UserContext";
import { useChatSocket } from "../hooks/useWebSocket";

export default function GlobalSocket() {
  const { user } = useUser();
  useChatSocket(user?.email || "");
  return null;
}
