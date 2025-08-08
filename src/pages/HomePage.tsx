import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Modal from "../components/Modal";
import AuthPopup from "../components/AuthPopup";
import ProfilePopup from "../components/ProfilePopup";
import { useUser } from "../context/UserContext";
import { searchUsersAndGroups } from "../services/searchService";
import { SearchResponse, SearchResult } from "../types/searchTypes";
import { getUserByNickname } from "../services/userService"; // You'll need this service
import { UserDTO } from "../types/userDTO";
import { Users, Check, X } from "lucide-react";
import { getIncomingRequests, respondToRequest } from "../services/friendService";
import { FriendRequest } from "../types/friendRequestType";

type SearchFilter = 'users' | 'groups';
type LocalFriendRequest = FriendRequest & { 
  responseStatus?: 'accepted' | 'rejected';
  isProcessing?: boolean;
};

export default function HomePage() {
  const navigate = useNavigate();
  const { nickname } = useParams<{ nickname: string }>();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 });
  const { user, loading, logout } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Profile popup states
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserDTO | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Search related states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse>({ users: [], groups: [] });
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('users');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, [user]); // Fetch when user becomes available

  // Refetch requests when returning from a profile (location changes)
  useEffect(() => {
    // If we're back on the home page (no nickname in params), refetch requests
    if (!nickname && user && location.pathname === "/") {
      fetchIncomingRequests();
    }
  }, [location.pathname, nickname, user]);
  
  // Handle profile popup based on URL
  useEffect(() => {
    // Profile popup opening
    if (nickname && location.pathname.startsWith("/profile/")) {
      openProfilePopup(nickname);
    } else {
      setProfilePopupOpen(false);
      setProfileUser(null);
    }
  }, [nickname, location.pathname]);

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

  const openProfilePopup = async (userNickname: string) => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const userData = await getUserByNickname(userNickname);
      setProfileUser(userData);
      setProfilePopupOpen(true);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      // Navigate back to home if user not found
      navigate("/");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfilePopup = () => {
    setProfilePopupOpen(false);
    setProfileUser(null);
    // Navigate back to home page
    navigate("/");
  };

  const handleAuth = () => {
    setOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x, y });
  };

  // Navigate to user's own profile
  const handleProfileClick = () => {
    if (user?.nickname) {
      navigate(`/profile/${user.nickname}`);
    }
    setDropdownOpen(false);
  };

  // Search functionality
  const performSearch = async (query: string) => {
    if (!user) return;

    setSearchLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const data = await searchUsersAndGroups(query, token);
      setSearchResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search - only search when query has at least 1 character
  useEffect(() => {
    if (!user) return;
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        performSearch(searchQuery);
      } else if (searchDropdownOpen && searchQuery.trim().length === 0) {
        setSearchResults({ users: [], groups: [] });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search input focus
  const handleSearchFocus = () => {
    setSearchDropdownOpen(true);
  };

  // Handle clicking outside search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'USER') {
      navigate(`/profile/${result.nickname}`);
    } else {
      // Navigate to group page normally
      navigate(`/group/${result.id}`);
    }
    setSearchDropdownOpen(false);
    setSearchQuery("");
  };

  const getFilteredResults = () => {
    const { users, groups } = searchResults;
    
    switch (searchFilter) {
      case 'users':
        return { users, groups: [] };
      case 'groups':
        return { users: [], groups };
      default:
        return { users, groups };
    }
  };

  const renderSearchResults = () => {
    const filteredResults = getFilteredResults();
    const { users, groups } = filteredResults;
    const hasResults = users.length > 0 || groups.length > 0;

    if (searchLoading) {
      return (
        <div className="p-4 text-center text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span>Searching...</span>
          </div>
        </div>
      );
    }

    if (!hasResults && searchQuery.trim().length >= 1) {
      return (
        <div className="p-4 text-center text-gray-400">
          No results found for "{searchQuery}"
        </div>
      );
    }

    if (searchQuery.trim().length === 0) {
      return (
        <div className="p-4 text-center text-gray-400">
          Start typing to search for users and groups
        </div>
      );
    }

    return (
      <div className="max-h-96 overflow-y-auto">
        {users.length > 0 && (
          <div>
            {users.map((user) => (
              <button
                key={`user-${user.id}`}
                onClick={() => handleResultClick(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 p-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                    <img
                      src={user.profileImageUrl || "https://via.placeholder.com/300"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {user.name} {user.surname}, @{user.nickname || user.name.toLowerCase()}
                  </div>
                  <div className="text-sm text-gray-400">
                    {user.mutualFriendCount > 0 ? `${user.mutualFriendCount} mutual friends` : 'No mutual friends'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <div>
            {groups.map((group) => (
              <button
                key={`group-${group.id}`}
                onClick={() => handleResultClick(group)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {group.name[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-gray-400">
                    {group.mutualFriendCount > 0 ? `${group.mutualFriendCount} mutual friends in group` : 'Group'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 relative">
        <div className="flex items-center space-x-3">
          <img src="/img4.png" alt="SebetPage Logo" className="w-20 h-20" />
          <span className="text-3xl font-bold tracking-tight mb-2 bg-white bg-clip-text text-transparent">
            SebetPage
          </span>
        </div>

        <nav className="space-x-8 text-lg mr-auto ml-40">
          <a href="#" className="hover:text-pink-400 transition-colors">Friends</a>
          <a href="#" className="hover:text-purple-400 transition-colors">Explore</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Community</a>
        </nav>

        {user && !loading && (
        <>
          {/* Incoming Friend Requests Icon */}
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
        </>
      )}

        {/* Search Bar - Only show when user is logged in */}
        {user && !loading && (
          <div ref={searchRef} className="relative mx-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search users and groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                className="w-80 pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-gray-800"
              />
            </div>

            {/* Search Dropdown */}
            {searchDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50">
                {/* Filter Tabs */}
                <div className="flex border-b border-gray-700">
                  <button
                    onClick={() => setSearchFilter('users')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      searchFilter === 'users'
                        ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setSearchFilter('groups')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      searchFilter === 'groups'
                        ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Groups
                  </button>
                </div>

                {/* Search Results */}
                {renderSearchResults()}
              </div>
            )}
          </div>
        )}

        {/* Right side - Auth/User controls */}
        {!user && !loading && (
          <button
            onClick={() => setOpen(true)}
            onMouseMove={handleMouseMove}
            style={{
              background: `radial-gradient(circle at ${hoverPos.x}% ${hoverPos.y}%, #6366f1, #8b5cf6, #ec4899)`,
              transition: "background 0.2s ease-out"
            }}
            className="px-5 py-2 rounded-full font-medium text-white"
          >
            Log in
          </button>
        )}

        {loading && (
          <div className="w-24 h-8 bg-gray-700 rounded animate-pulse"></div>
        )}

        {user && !loading && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full"
            >
              <span>{user.name} {user.surname}</span>
              <svg
                className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg z-50">
                <button
                  onClick={handleProfileClick}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 md:py-40">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent">
          {user ? "Welcome back!" : "Create. Share. Connect."}
        </h1>
        <p className="text-gray-300 max-w-xl mb-8 text-lg">
          {user
            ? "This is your personalized dashboard."
            : "SebetPage helps you turn your creative passion into a meaningful experience."}
        </p>
        {!user && (
          <button
            onClick={() => setOpen(true)}
            className="px-8 py-3 text-lg rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-80 font-medium transition"
          >
            Get Started
          </button>
        )}
      </section>

      {/* Login Modal */}
      {!user && (
        <Modal open={open} onClose={() => setOpen(false)}>
          <AuthPopup
            initialMode="login"
            onSubmit={handleAuth}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}

      {/* Profile Popup */}
      {profilePopupOpen && profileUser && (
        <ProfilePopup
          user={profileUser}
          onClose={closeProfilePopup}
        />
      )}

      {/* Profile Loading State */}
      {profileLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="flex items-center gap-3 text-white">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span>Loading profile...</span>
          </div>
        </div>
      )}
    </div>
  );
}