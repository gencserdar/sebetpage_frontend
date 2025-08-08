import { useState, useCallback } from "react";
import { useChatSocket, ChatMessage } from "../../hooks/useChatSocket";

interface Props {
  /* JWT’teki subject – WS’de kullanılır */
  meEmail: string;
  /* ekranda görünecek takma ad */
  meNickname: string;

  friendEmail: string;
  friendNickname: string;

  onClose: () => void;
}

export default function FriendChat({
  meEmail,
  meNickname,
  friendEmail,
  friendNickname,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  /** Gelen mesajı e-posta → nickname çevirerek ekrana bas */
  const handleIncomingMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.from === friendEmail || msg.to === friendEmail) {
        const sender =
          msg.from === meEmail ? meNickname : friendNickname;
        setMessages(prev => [...prev, `${sender}: ${msg.content}`]);
      }
    },
    [meEmail, meNickname, friendEmail, friendNickname]
  );

  /* Principal (e-posta) ile socket aç */
  const { sendMessage } = useChatSocket(meEmail, handleIncomingMessage);

  const handleSend = () => {
    if (!input.trim()) return;

    sendMessage({
      from: meEmail,
      to: friendEmail,
      content: input.trim(),
    });
    setInput("");
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded shadow-lg w-80 text-white">
      {/* Başlık */}
      <div className="flex justify-between mb-2">
        <strong>{friendNickname}</strong>
        <button onClick={onClose} className="text-red-400">
          ✕
        </button>
      </div>

      {/* Mesaj listesi */}
      <div className="h-48 overflow-y-auto mb-2 bg-gray-700 p-2 rounded">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      {/* Giriş alanı */}
      <div className="flex">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 p-1 rounded bg-gray-600"
          onKeyDown={e => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button onClick={handleSend} className="ml-2 px-2 bg-blue-600 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
