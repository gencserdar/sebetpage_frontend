import { Newspaper } from "lucide-react";
import FriendChatHeader from "./FriendChatHeader";
import FriendChatInput from "./FriendChatInput";
import FriendChatMessageList from "./FriendChatMessageList";
import ChatDeleteConfirm from "./ChatDeleteConfirm";
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

  const blockedBanner = !chat.isRemoved && chat.isBlocked && (
    <div className="mb-3 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center">
      <div className="text-amber-300 text-sm">
        {chat.blockedByMe
          ? "You blocked this user. Unblock them from their profile to message again."
          : "This user has blocked you. You can't send messages."}
      </div>
    </div>
  );

  const header = (
    <FriendChatHeader
      friendNickname={friendNickname}
      friendUserId={friendUserId}
      unreadCount={chat.unreadCount}
      typingLabel={chat.typingLabel}
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <FriendChatMessageList
        listRef={chat.listRef}
        loading={chat.loading}
        loadingOlder={chat.loadingOlder}
        renderItems={chat.renderItems}
        myUserId={chat.myUserId}
        seenMyMessageId={chat.seenMyMessageId}
        editingMessageId={chat.editingMessageId}
        editDraft={chat.editDraft}
        onEditDraftChange={chat.setEditDraft}
        onEditSave={chat.handleEditSave}
        onEditCancel={chat.handleEditCancel}
        onStartEdit={chat.handleStartEdit}
        onDelete={chat.handleDeleteMessage}
        actionPending={chat.messageActionPending}
      />
      {chat.pendingDeleteMessage && (
        <ChatDeleteConfirm
          pending={chat.messageActionPending}
          onCancel={chat.handleCancelDelete}
          onConfirm={chat.handleConfirmDelete}
        />
      )}
    </div>
  );

  const actionErrorBanner = chat.actionError ? (
    <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      <span>{chat.actionError}</span>
      <button
        type="button"
        onClick={() => chat.setActionError(null)}
        className="shrink-0 text-red-300 hover:text-white"
      >
        Dismiss
      </button>
    </div>
  ) : null;

  const input = (
    <div className="shrink-0">
    <FriendChatInput
      inputRef={chat.inputEl}
      inputValue={chat.inputValue}
      isRemoved={chat.isRemoved}
      isBlocked={chat.isBlocked}
      blockHint={chat.blockHint}
      isSending={chat.isSending}
      conversationId={chat.conversationId}
      onInputChange={chat.handleInputChange}
      onSend={chat.handleSend}
    />
    </div>
  );

  if (chat.isExpanded) {
    return (
      <div className="fixed inset-0 z-50 hidden flex-col bg-black/90 md:flex md:flex-col lg:flex-row">
        {expandedRail ? <div className="hidden lg:block">{expandedRail}</div> : null}
        <div className="flex h-[42vh] min-h-0 shrink-0 flex-col overflow-hidden bg-app-surface/90 backdrop-blur-xl lg:h-auto lg:min-h-0 lg:w-1/2 lg:shrink">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-5 py-4 lg:pl-16">
            <span className="select-none text-lg font-bold tracking-wide text-indigo-400">
              SebetPage
            </span>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                title="Search"
              >
                <SearchIcon />
              </button>
              <button
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                title="Incoming requests"
              >
                <BellIcon />
              </button>
              <button
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/10 bg-app-surface/95 p-3 backdrop-blur-xl sm:p-4 lg:h-auto lg:w-1/2 lg:border-l lg:border-t-0">
          {header}
          {removedBanner}
          {blockedBanner}
          {actionErrorBanner}
          {messages}
          {input}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ zIndex: 55 }}
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-app-surface/95 p-3 text-white backdrop-blur-xl md:inset-auto md:bottom-4 md:right-4 md:h-[min(32rem,calc(100vh-2rem))] md:max-h-[calc(100vh-2rem)] md:min-h-0 md:w-[min(24rem,calc(100vw-2rem))] md:rounded-2xl md:border md:border-white/10 md:p-4 md:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
    >
      {header}
      {removedBanner}
      {blockedBanner}
      {actionErrorBanner}
      {messages}
      {input}
    </div>
  );
}
