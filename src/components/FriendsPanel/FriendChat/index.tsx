import { Newspaper } from "lucide-react";
import FriendChatHeader from "./FriendChatHeader";
import FriendChatInput from "./FriendChatInput";
import FriendChatMessageList from "./FriendChatMessageList";
import { BellIcon, ChevronIcon, SearchIcon } from "./icons";
import { FriendChatProps } from "./types";
import { useFriendChat } from "./useFriendChat";

export default function FriendChat({
  meEmail,
  friendUserId,
  friendEmail,
  friendNickname,
  onClose,
  onRemoved,
  unreadCount = 0,
  expandedRail,
  initialExpanded = false,
  onExpandedChange,
  onGroupCreated,
}: FriendChatProps) {
  const chat = useFriendChat({
    meEmail,
    friendUserId,
    friendEmail,
    friendNickname,
    onRemoved,
    initialExpanded,
    onExpandedChange,
  });

  const removedBanner = chat.isRemoved && (
    <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
      <div className="text-red-400 text-sm">
        Friendship ended. You can no longer send messages.
      </div>
    </div>
  );

  const header = (
    <FriendChatHeader
      friendNickname={friendNickname}
      friendUserId={friendUserId}
      unreadCount={unreadCount}
      isRemoved={chat.isRemoved}
      isExpanded={chat.isExpanded}
      showAddPanel={chat.showAddPanel}
      addSearch={chat.addSearch}
      filteredFriends={chat.filteredFriends}
      loadingFriends={chat.loadingFriends}
      creatingGroup={chat.creatingGroup}
      addBtnRef={chat.addBtnRef}
      addPanelRef={chat.addPanelRef}
      onOpenProfile={chat.openFriendProfile}
      onToggleAdd={chat.handleToggleAdd}
      onToggleExpanded={() => chat.setIsExpanded((v) => !v)}
      onClose={onClose}
      onAddSearchChange={chat.setAddSearch}
      onGroupCreated={onGroupCreated}
      setShowAddPanel={chat.setShowAddPanel}
      setAddSearch={chat.setAddSearch}
      setCreatingGroup={chat.setCreatingGroup}
    />
  );

  const messages = (
    <FriendChatMessageList
      listRef={chat.listRef}
      expanded={chat.isExpanded}
      loading={chat.loading}
      loadingOlder={chat.loadingOlder}
      renderItems={chat.renderItems}
      myUserId={chat.myUserId}
      seenMyMessageId={chat.seenMyMessageId}
    />
  );

  const input = (
    <FriendChatInput
      inputRef={chat.inputEl}
      inputValue={chat.inputValue}
      isRemoved={chat.isRemoved}
      isSending={chat.isSending}
      conversationId={chat.conversationId}
      onInputChange={chat.setInputValue}
      onSend={chat.handleSend}
    />
  );

  if (chat.isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black/90">
        {expandedRail}
        <div className="h-1/2 md:h-auto md:w-1/2 flex flex-col bg-gray-900/95 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 pl-16 border-b border-gray-800/40 bg-gray-950/80">
            <span className="text-lg font-bold tracking-wide text-indigo-400 select-none">
              SebetPage
            </span>
            <div className="flex items-center gap-3">
              <button
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/60"
                title="Search"
              >
                <SearchIcon />
              </button>
              <button
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/60"
                title="Incoming requests"
              >
                <BellIcon />
              </button>
              <button
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/60"
                title="Menu"
              >
                <ChevronIcon />
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 select-none gap-2">
            <Newspaper className="w-10 h-10 opacity-40" aria-hidden="true" />
            <span className="text-sm">Posts</span>
          </div>
        </div>

        <div className="h-1/2 min-h-0 md:h-auto md:w-1/2 flex flex-col bg-gray-950/98 backdrop-blur-xl p-4 border-t md:border-t-0 md:border-l border-gray-800/40 overflow-hidden">
          {header}
          {removedBanner}
          {messages}
          {input}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ zIndex: 51 }}
      className="fixed bottom-4 right-4 bg-gray-950/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-96 text-white border border-gray-800/40"
    >
      {header}
      {removedBanner}
      {messages}
      {input}
    </div>
  );
}
