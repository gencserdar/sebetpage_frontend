import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Users, X } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useProfileNavigation } from "../../hooks/useProfileNavigation";
import { getIncomingRequests, respondToRequest } from "../../services/friendService";
import { FriendRequest } from "../../types/friendRequestType";
import { useChatSocketContext } from "../../context/ChatSocketContext";

type LocalFriendRequest = FriendRequest & {
  responseStatus?: "accepted" | "rejected";
  isProcessing?: boolean;
};

interface FriendRequestsDropdownProps {
  inline?: boolean;
  onNavigate?: () => void;
  onPendingCountChange?: (count: number) => void;
}

export default function FriendRequestsDropdown({
  inline = false,
  onNavigate,
  onPendingCountChange,
}: FriendRequestsDropdownProps) {
  const location = useLocation();
  const { openProfile } = useProfileNavigation();
  const { user } = useUser();

  const [incomingRequests, setIncomingRequests] = useState<LocalFriendRequest[]>([]);
  const [showRequestDropdown, setShowRequestDropdown] = useState(false);

  const { subscribeFriendEvents } = useChatSocketContext();

  const fetchIncomingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getIncomingRequests();
      setIncomingRequests(res.map((req) => ({ ...req, isProcessing: false })));
    } catch (err) {
      console.error("Failed to fetch incoming requests:", err);
    }
  }, [user]);

  const handleDropdownToggle = () => {
    setShowRequestDropdown((prev) => {
      const newState = !prev;
      if (newState) void fetchIncomingRequests();
      return newState;
    });
  };

  useEffect(() => {
    void fetchIncomingRequests();

    const unsubscribe = subscribeFriendEvents((event: any) => {
      const eventType = event?.type;

      switch (eventType) {
        case "FRIEND_REQUEST_RECEIVED":
          if (event.request) {
            setIncomingRequests((prev) => {
              const exists = prev.some((req) => req.id === event.request.id);
              if (!exists) {
                return [...prev, { ...event.request, isProcessing: false }];
              }
              return prev;
            });
          }
          break;

        case "FRIEND_REQUEST_ACCEPTED":
        case "FRIEND_REQUEST_REJECTED":
          if (event.requestId) {
            setIncomingRequests((prev) => prev.filter((req) => req.id !== event.requestId));
          }
          break;

        case "FRIEND_REQUEST_CANCELLED":
          setIncomingRequests((currentRequests) => {
            let filtered = currentRequests;
            let removedCount = 0;

            if (event.requestId) {
              filtered = currentRequests.filter((req) => req.id !== event.requestId);
              removedCount = currentRequests.length - filtered.length;
            } else if (event.request?.id) {
              filtered = currentRequests.filter((req) => req.id !== event.request.id);
              removedCount = currentRequests.length - filtered.length;
            } else if (event.fromUserId) {
              filtered = currentRequests.filter((req) => req.fromUser.id !== event.fromUserId);
              removedCount = currentRequests.length - filtered.length;
            }

            if (removedCount === 0) {
              setTimeout(() => void fetchIncomingRequests(), 100);
            }

            return filtered;
          });
          break;

        default:
          if (
            eventType &&
            (eventType.includes("FRIEND") || eventType.includes("REQUEST"))
          ) {
            void fetchIncomingRequests();
          }
          break;
      }
    });

    return () => unsubscribe();
  }, [user, subscribeFriendEvents, fetchIncomingRequests]);

  useEffect(() => {
    if (user && !location.pathname.startsWith("/profile/")) {
      void fetchIncomingRequests();
    }
  }, [location.pathname, user, fetchIncomingRequests]);

  useEffect(() => {
    if (inline) void fetchIncomingRequests();
  }, [inline, fetchIncomingRequests]);

  const handleRequestResponse = async (id: number, accept: boolean) => {
    setIncomingRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              responseStatus: accept ? "accepted" : "rejected",
              isProcessing: false,
            }
          : r
      )
    );

    try {
      await respondToRequest(id, accept);
      setTimeout(() => {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    } catch (e) {
      console.error("Failed to respond to request:", e);
      setTimeout(() => {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    }
  };

  const handleRequestUserClick = (userNickname: string, userId: number) => {
    setShowRequestDropdown(false);
    openProfile(userNickname, userId);
    onNavigate?.();
  };

  const pendingCount = incomingRequests.filter((req) => !req.responseStatus).length;

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  const renderRequestList = () => {
    if (incomingRequests.length === 0) {
      return <div className="px-5 py-3 text-sm text-gray-400">No incoming requests</div>;
    }

    return (
      <div className="space-y-1 px-3 pb-3">
        {incomingRequests.map((req) => (
          <div
            key={req.id}
            className={`flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl px-3 py-2 transition-all duration-500 ${
              req.responseStatus === "accepted"
                ? "border border-green-400/50 bg-green-500/20"
                : req.responseStatus === "rejected"
                  ? "border border-red-400/50 bg-red-500/20"
                  : "border border-transparent active:bg-white/5"
            }`}
          >
            <button
              type="button"
              onClick={() => handleRequestUserClick(req.fromUser.nickname, req.fromUser.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <img
                src={req.fromUser.profileImageUrl || "/default_pp.png"}
                alt="Profile"
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <span className="truncate text-base text-white">{req.fromUser.nickname}</span>
              {req.responseStatus && (
                <span
                  className={`text-sm font-medium ${
                    req.responseStatus === "accepted" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {req.responseStatus === "accepted" ? "Accepted" : "Rejected"}
                </span>
              )}
            </button>

            {!req.responseStatus && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void handleRequestResponse(req.id, true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 active:bg-green-500"
                  title="Accept"
                >
                  <Check size={18} className="text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleRequestResponse(req.id, false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 active:bg-red-500"
                  title="Reject"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!user) return null;

  if (inline) {
    return (
      <section className="border-b border-white/[0.06]">
        <div className="flex min-h-[3.25rem] items-center gap-2 px-5 pt-2 text-base font-medium text-white">
          <Users size={18} className="text-gray-400" />
          Friend requests
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </div>
        {renderRequestList()}
      </section>
    );
  }

  return (
    <div className="relative hidden shrink-0 md:block">
      <button
        type="button"
        onClick={handleDropdownToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        title="Friend Requests"
      >
        <Users size={20} />
        {pendingCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {pendingCount}
          </span>
        )}
      </button>

      {showRequestDropdown && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-lg">
          <h3 className="mb-2 font-semibold text-white">Incoming Requests</h3>
          {incomingRequests.length === 0 ? (
            <div className="text-sm text-gray-400">No requests</div>
          ) : (
            <div className="space-y-2">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-all duration-500 ${
                    req.responseStatus === "accepted"
                      ? "border border-green-400/50 bg-green-500/30"
                      : req.responseStatus === "rejected"
                        ? "border border-red-400/50 bg-red-500/30"
                        : "border border-transparent hover:bg-gray-700/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleRequestUserClick(req.fromUser.nickname, req.fromUser.id)
                    }
                    className="flex flex-1 items-center gap-2 text-left hover:opacity-80"
                  >
                    <img
                      src={req.fromUser.profileImageUrl || "/default_pp.png"}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="text-white">{req.fromUser.nickname}</span>
                  </button>
                  {!req.responseStatus && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRequestResponse(req.id, true)}
                        className="rounded-full bg-green-600 p-1.5 hover:bg-green-500"
                      >
                        <Check size={16} className="text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRequestResponse(req.id, false)}
                        className="rounded-full bg-red-600 p-1.5 hover:bg-red-500"
                      >
                        <X size={16} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
