import { Bell, ChevronDown, Newspaper, Search } from "lucide-react";
import GroupSettingsModal from "../GroupSettingsModal/index";
import FriendChatInput from "../FriendChat/FriendChatInput";
import GroupChatHeader from "./GroupChatHeader";
import GroupChatMessageList from "./GroupChatMessageList";
import { useGroupChat } from "./useGroupChat";
import { GroupChatProps } from "./types";

export default function GroupChat(props: GroupChatProps) {
  const {
    expandedRail,
    initialParticipants = [],
    onClose,
    ...hookParams
  } = props;

  const chat = useGroupChat({ ...hookParams, initialParticipants, onClose });

  const header = (
    <GroupChatHeader
      displayName={chat.displayName}
      detail={chat.detail}
      initialParticipants={initialParticipants}
      canAddMembers={chat.canAddMembers}
      showAddPanel={chat.showAddPanel}
      addSearch={chat.addSearch}
      loadingFriends={chat.loadingFriends}
      filteredFriends={chat.filteredFriends}
      addingMemberId={chat.addingMemberId}
      isExpanded={chat.isExpanded}
      addBtnRef={chat.addBtnRef}
      addPanelRef={chat.addPanelRef}
      onOpenSettings={() => chat.setSettingsOpen(true)}
      onToggleAdd={chat.handleToggleAdd}
      onToggleExpanded={() => chat.setIsExpanded((v) => !v)}
      onClose={onClose}
      onAddSearchChange={chat.setAddSearch}
      onAddMember={chat.addMember}
    />
  );

  const messageList = (
    <GroupChatMessageList
      listRef={chat.listRef}
      expanded={chat.isExpanded}
      loading={chat.loading}
      loadingOlder={chat.loadingOlder}
      renderItems={chat.renderItems}
      messages={chat.messages}
      myUserId={chat.myUserId}
      nickOf={chat.nickOf}
    />
  );

  const input = (
    <FriendChatInput
      inputRef={chat.inputRef}
      inputValue={chat.inputValue}
      isRemoved={false}
      isSending={chat.isSending}
      conversationId={chat.conversationId}
      onInputChange={chat.setInputValue}
      onSend={chat.handleSend}
    />
  );

  const settingsModal = (
    <GroupSettingsModal
      groupId={chat.conversationId}
      open={chat.settingsOpen}
      onClose={() => chat.setSettingsOpen(false)}
      onChanged={chat.applyDetail}
      onDeleted={chat.handleGroupDeleted}
    />
  );

  if (chat.isExpanded) {
    return (
      <>
        <div className="fixed inset-0 z-50 hidden flex-col bg-black/90 md:flex md:flex-col lg:flex-row">
          {expandedRail ? <div className="hidden lg:block">{expandedRail}</div> : null}
          <div className="flex h-[42vh] min-h-0 shrink-0 flex-col overflow-hidden bg-app-surface/90 backdrop-blur-xl lg:h-auto lg:min-h-0 lg:w-1/2 lg:shrink">
            <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-5 py-4 lg:pl-16">
              <span className="select-none text-lg font-bold tracking-wide text-indigo-400">SebetPage</span>
              <div className="flex items-center gap-3">
                <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white" title="Search">
                  <Search className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white" title="Incoming requests">
                  <Bell className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white" title="Menu">
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex flex-1 select-none flex-col items-center justify-center gap-2 text-gray-600">
              <Newspaper className="h-10 w-10 opacity-40" />
              <span className="text-sm">Posts</span>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/10 bg-app-surface/95 p-3 backdrop-blur-xl sm:p-4 lg:h-auto lg:w-1/2 lg:border-l lg:border-t-0">
            {header}
            {messageList}
            {input}
          </div>
        </div>
        {settingsModal}
      </>
    );
  }

  return (
    <>
      <div
        style={{ zIndex: 55 }}
        className="fixed inset-0 flex min-h-0 flex-col bg-app-surface/95 p-3 text-white backdrop-blur-xl md:inset-auto md:bottom-4 md:right-4 md:h-auto md:min-h-0 md:w-[min(24rem,calc(100vw-2rem))] md:rounded-2xl md:border md:border-white/10 md:p-4 md:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        {header}
        {messageList}
        {input}
      </div>
      {settingsModal}
    </>
  );
}
