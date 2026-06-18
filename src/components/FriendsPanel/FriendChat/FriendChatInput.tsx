interface FriendChatInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputValue: string;
  isRemoved: boolean;
  isBlocked?: boolean;
  blockHint?: string | null;
  isSending: boolean;
  conversationId: number | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function FriendChatInput({
  inputRef,
  inputValue,
  isRemoved,
  isBlocked = false,
  blockHint,
  isSending,
  conversationId,
  onInputChange,
  onSend,
}: FriendChatInputProps) {
  const locked = isRemoved || isBlocked;
  const placeholder = isRemoved
    ? "Friendship ended..."
    : isBlocked
    ? blockHint || "Messaging unavailable..."
    : isSending
    ? "Sending..."
    : "Type a message…";

  return (
    <div className="border-t border-white/10 pt-3">
      <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        type="text"
        name="chat-message"
        autoComplete="off"
        spellCheck={false}
        className={`flex-1 p-2 rounded-xl text-white placeholder-gray-500 outline-none border-none focus:ring-2 border backdrop-blur-sm ${
          locked || isSending
            ? "cursor-not-allowed border-white/10 bg-white/[0.04]"
            : "border-white/10 bg-white/[0.06] focus:ring-indigo-500/60"
        }`}
        placeholder={placeholder}
        disabled={locked || isSending}
      />
      <button
        onClick={onSend}
        className={`px-3 py-2 rounded-xl transition-colors duration-200 border-none backdrop-blur-sm flex items-center justify-center min-w-[60px] ${
          locked || !conversationId || isSending
            ? "cursor-not-allowed border-white/10 bg-white/[0.04] text-gray-500"
            : "bg-indigo-500/80 hover:bg-indigo-400/80 border-indigo-400/20 text-white"
        }`}
        disabled={!conversationId || locked || isSending}
        title={
          isRemoved
            ? "Friend removed you"
            : isBlocked
            ? blockHint || "Messaging unavailable"
            : !conversationId
            ? "Connecting..."
            : isSending
            ? "Sending..."
            : "Send"
        }
      >
        {isSending ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          "Send"
        )}
      </button>
      </div>
    </div>
  );
}
