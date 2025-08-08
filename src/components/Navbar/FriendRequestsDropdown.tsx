import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { getIncomingRequests, respondToRequest } from "../../services/friendService";
import { FriendRequest } from "../../types/friendRequestType";
import { Users, Check, X } from "lucide-react";

type LocalFriendRequest = FriendRequest & { 
  responseStatus?: 'accepted' | 'rejected';
  isProcessing?: boolean;
};

export default function FriendRequestsDropdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const { nickname } = useParams<{ nickname: string }>();
  const { user } = useUser();
  
  const [incomingRequests, setIncomingRequests] = useState<LocalFriendRequest[]>([]);
  const [showRequestDropdown, setShowRequestDropdown] = useState(false);

  // Fetch incoming requests function
  const fetchIncomingRequests = async () => {
    if (user) {
      try {
        const res = await getIncomingRequests();
        setIncomingRequests(res.map(req => ({ ...req, isProcessing: false })));
      } catch (err) {
        console.error("Failed to fetch incoming requests:", err);
      }
    }
  };

  // Fetch incoming requests when user is available
  useEffect(() => {
    fetchIncomingRequests();
  }, [user]);

  // Refetch requests when returning from a profile (location changes)
  useEffect(() => {
    // If we're back on the home page (no nickname in params), refetch requests
    if (!nickname && user && location.pathname === "/") {
      fetchIncomingRequests();
    }
  }, [location.pathname, nickname, user]);

  const handleRequestResponse = async (id: number, accept: boolean) => {
    // Immediately set the response status on frontend (optimistic update)
    setIncomingRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { 
          ...r, 
          responseStatus: accept ? "accepted" : "rejected",
          isProcessing: false 
        } : r
      )
    );

    try {
      // Make the backend call
      await respondToRequest(id, accept);

      // Remove from list after showing the status for a short time
      setTimeout(() => {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
      }, 1500);

    } catch (e) {
      console.error("Failed to respond to request:", e);
      
      // On error, still remove the request after showing rejected status
      setTimeout(() => {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    }
  };

  // Handle clicking on a friend request user info to open their profile
  const handleRequestUserClick = (userNickname: string) => {
    setShowRequestDropdown(false); // Close the dropdown
    navigate(`/profile/${userNickname}`); // Navigate to their profile
  };

  // Only render if user is logged in
  if (!user) return null;

  return (
    <div className="relative ml-4">
      <button
        onClick={() => setShowRequestDropdown((prev) => !prev)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition"
        title="Friend Requests"
      >
        <Users size={20} />
        {incomingRequests.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {incomingRequests.filter(req => !req.responseStatus).length}
          </span>
        )}
      </button>

      {showRequestDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 p-3">
          <h3 className="text-white font-semibold mb-2">Incoming Requests</h3>
          {incomingRequests.length === 0 ? (
            <div className="text-sm text-gray-400">No requests</div>
          ) : (
            <div className="space-y-2">
              {incomingRequests.map((req) => (
                <div 
                  key={req.id} 
                  className={`
                    flex items-center justify-between gap-3 py-2 px-3 rounded-lg transition-all duration-500 ease-in-out
                    ${req.responseStatus === 'accepted' 
                      ? 'bg-green-500/30 border border-green-400/50' 
                      : req.responseStatus === 'rejected' 
                      ? 'bg-red-500/30 border border-red-400/50' 
                      : 'hover:bg-gray-700/50 border border-transparent'
                    }
                  `}
                >
                  {/* User info section - now clickable */}
                  <button
                    onClick={() => handleRequestUserClick(req.fromUser.nickname)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left flex-1"
                  >
                    <img
                      src={req.fromUser.profileImageUrl || "/default_pp.png"}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-white">{req.fromUser.nickname}</span>
                    {req.responseStatus && (
                      <span className={`
                        ml-2 text-sm font-medium
                        ${req.responseStatus === 'accepted' ? 'text-green-400' : 'text-red-400'}
                      `}>
                        {req.responseStatus === 'accepted' ? 'Accepted' : 'Rejected'}
                      </span>
                    )}
                  </button>
                  
                  {/* Action buttons section */}
                  <div className="flex gap-2">
                    {/* Show action buttons only when not responded */}
                    {!req.responseStatus && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the user click
                            handleRequestResponse(req.id, true);
                          }}
                          className="p-1.5 rounded-full bg-green-600 hover:bg-green-500 hover:scale-110 transition-all duration-200"
                          title="Accept"
                        >
                          <Check size={16} className="text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the user click
                            handleRequestResponse(req.id, false);
                          }}
                          className="p-1.5 rounded-full bg-red-600 hover:bg-red-500 hover:scale-110 transition-all duration-200"
                          title="Reject"
                        >
                          <X size={16} className="text-white" />
                        </button>
                      </>
                    )}

                    {/* Show status icon when responded */}
                    {req.responseStatus && (
                      <div className={`
                        p-1.5 rounded-full transition-all duration-300
                        ${req.responseStatus === 'accepted' ? 'bg-green-600' : 'bg-red-600'}
                      `}>
                        {req.responseStatus === 'accepted' ? (
                          <Check size={16} className="text-white" />
                        ) : (
                          <X size={16} className="text-white" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}