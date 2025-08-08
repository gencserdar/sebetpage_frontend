import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { searchUsersAndGroups } from "../../services/searchService";
import { SearchResponse, SearchResult } from "../../types/searchTypes";

type SearchFilter = 'users' | 'groups';

export default function SearchBar() {
  const navigate = useNavigate();
  const { user } = useUser();
  
  // Search related states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse>({ users: [], groups: [] });
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('users');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search functionality
  const performSearch = async (query: string) => {
    if (!user) return;

    setSearchLoading(true);
    try {
      const data = await searchUsersAndGroups(query);
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
  }, [searchQuery, user]);

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

  // Only render if user is logged in
  if (!user) return null;

  return (
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
  );
}