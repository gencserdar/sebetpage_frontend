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
      <div className="fixed inset-0 z-50 hidden flex-col bg-black/90 md:flex md:flex-col lg:flex-row">
        {expandedRail ? <div className="hidden lg:block">{expandedRail}</div> : null}
        <div className="flex h-[42vh] min-h-0 shrink-0 flex-col overflow-hidden bg-gray-900/95 backdrop-blur-xl lg:h-auto lg:min-h-0 lg:w-1/2 lg:shrink">
          <div className="flex items-center justify-between border-b border-gray-800/40 bg-gray-950/80 px-5 py-4 lg:pl-16">
            <span className="select-none text-lg font-bold tracking-wide text-indigo-400">
              SebetPage
            </span>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white"
                title="Search"
              >
                <SearchIcon />
              </button>
              <button
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white"
                title="Incoming requests"
              >
                <BellIcon />
              </button>
              <button
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white"
                title="Menu"
              >
                <ChevronIcon />
              </button>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-600 select-none">
            <Newspaper className="h-10 w-10 opacity-40" aria-hidden="true" />
            <span className="text-sm">Posts</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-800/40 bg-gray-950/98 p-3 backdrop-blur-xl sm:p-4 lg:h-auto lg:w-1/2 lg:border-l lg:border-t-0">
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
      style={{ zIndex: 55 }}
      className="fixed inset-0 flex min-h-0 flex-col bg-gray-950/98 p-3 text-white backdrop-blur-xl md:inset-auto md:bottom-4 md:right-4 md:h-auto md:min-h-0 md:w-[min(24rem,calc(100vw-2rem))] md:rounded-2xl md:border md:border-gray-800/40 md:p-4 md:shadow-2xl"
    >
      {header}
      {removedBanner}
      {messages}
      {input}
    </div>
  );
}
