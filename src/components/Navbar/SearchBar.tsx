import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useProfileNavigation } from "../../hooks/useProfileNavigation";
import { searchUsersAndGroups } from "../../services/searchService";
import { SearchResponse, SearchResult } from "../../types/searchTypes";

type SearchFilter = "users" | "communities";

interface SearchBarProps {
  embedded?: boolean;
  onResultSelect?: () => void;
}

export default function SearchBar({ embedded = false, onResultSelect }: SearchBarProps) {
  const navigate = useNavigate();
  const { openProfile } = useProfileNavigation();
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse>({
    users: [],
    communities: [],
  });
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("users");

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search users and communities...");

  useEffect(() => {
    if (embedded) {
      setSearchPlaceholder("Search users and communities...");
      return undefined;
    }

    const xl = window.matchMedia("(min-width: 1280px)");
    const lg = window.matchMedia("(min-width: 1024px)");

    const syncPlaceholder = () => {
      if (xl.matches) setSearchPlaceholder("Search users and communities...");
      else if (lg.matches) setSearchPlaceholder("Search users...");
      else setSearchPlaceholder("Search");
    };

    syncPlaceholder();
    xl.addEventListener("change", syncPlaceholder);
    lg.addEventListener("change", syncPlaceholder);
    return () => {
      xl.removeEventListener("change", syncPlaceholder);
      lg.removeEventListener("change", syncPlaceholder);
    };
  }, [embedded]);

  const performSearch = useCallback(
    async (query: string) => {
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
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        void performSearch(searchQuery);
      } else if (searchDropdownOpen && searchQuery.trim().length === 0) {
        setSearchResults({ users: [], communities: [] });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user, performSearch, searchDropdownOpen]);

  useEffect(() => {
    if (embedded) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [embedded]);

  const handleSearchFocus = () => {
    setSearchDropdownOpen(true);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "USER") {
      openProfile(result.nickname, Number(result.id));
    } else {
      navigate(`/community/${result.id}`);
    }
    setSearchDropdownOpen(false);
    setSearchQuery("");
    onResultSelect?.();
  };

  const getFilteredResults = () => {
    const { users, communities } = searchResults;

    switch (searchFilter) {
      case "users":
        return { users, communities: [] };
      case "communities":
        return { users: [], communities };
      default:
        return { users, communities };
    }
  };

  const renderSearchResults = () => {
    const filteredResults = getFilteredResults();
    const { users, communities } = filteredResults;
    const hasResults = users.length > 0 || communities.length > 0;

    if (searchLoading) {
      return (
        <div className="p-4 text-center text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span>Searching...</span>
          </div>
        </div>
      );
    }

    if (!hasResults && searchQuery.trim().length >= 1) {
      return (
        <div className="p-4 text-center text-gray-400">
          No results found for &quot;{searchQuery}&quot;
        </div>
      );
    }

    if (searchQuery.trim().length === 0) {
      return (
        <div className="p-4 text-center text-sm text-gray-400">
          Start typing to search for users and communities
        </div>
      );
    }

    return (
      <div className="indigo-scrollbar max-h-56 overflow-y-auto sm:max-h-72">
        {users.length > 0 && (
          <div>
            {users.map((result) => (
              <button
                key={`user-${result.id}`}
                type="button"
                onClick={() => handleResultClick(result)}
                className="flex w-full min-h-[3rem] items-center gap-3 px-4 py-2 text-left transition-colors active:bg-white/10"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 p-0.5">
                  <div className="h-full w-full overflow-hidden rounded-full bg-app-surface">
                    <img
                      src={result.profileImageUrl || "https://via.placeholder.com/300"}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {result.name} {result.surname}, @{result.nickname || result.name.toLowerCase()}
                  </div>
                  <div className="text-sm text-gray-400">
                    {result.mutualFriendCount > 0
                      ? `${result.mutualFriendCount} mutual friends`
                      : "No mutual friends"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {communities.length > 0 && (
          <div>
            {communities.map((community) => (
              <button
                key={`community-${community.id}`}
                type="button"
                onClick={() => handleResultClick(community)}
                className="flex w-full min-h-[3rem] items-center gap-3 px-4 py-2 text-left transition-colors active:bg-white/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 font-semibold text-white">
                  {community.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{community.name}</div>
                  <div className="text-sm text-gray-400">
                    {community.mutualFriendCount > 0
                      ? `${community.mutualFriendCount} mutual friends in community`
                      : "Community"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDropdown = () =>
    searchDropdownOpen ? (
      <div
        className={`${
          embedded ? "relative mt-2" : "absolute left-0 right-0 top-full z-50 mt-2"
        } overflow-hidden rounded-xl border border-white/10 bg-app-surface shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl`}
      >
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => setSearchFilter("users")}
            className={`min-h-[2.75rem] flex-1 px-4 text-sm font-medium transition-colors ${
              searchFilter === "users"
                ? "border-b-2 border-indigo-400 bg-white/[0.06] text-indigo-300"
                : "text-gray-400 active:bg-white/5"
            }`}
          >
            Users
          </button>
          <button
            type="button"
            onClick={() => setSearchFilter("communities")}
            className={`min-h-[2.75rem] flex-1 px-4 text-sm font-medium transition-colors ${
              searchFilter === "communities"
                ? "border-b-2 border-indigo-400 bg-white/[0.06] text-indigo-300"
                : "text-gray-400 active:bg-white/5"
            }`}
          >
            Communities
          </button>
        </div>
        {renderSearchResults()}
      </div>
    ) : null;

  const renderSearchField = () => (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        ref={searchInputRef}
        type="search"
        name="navbar-search"
        autoComplete="off"
        spellCheck={false}
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={handleSearchFocus}
        className="w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-base text-white placeholder-gray-400 focus:border-indigo-400/50 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-indigo-500/40 md:rounded-full md:py-2 md:text-sm"
      />
      {renderDropdown()}
    </div>
  );

  if (!user) return null;

  if (embedded) {
    return <div className="px-5 py-4">{renderSearchField()}</div>;
  }

  return (
    <div ref={searchRef} className="relative mx-2 hidden md:block md:w-52 lg:mx-4 lg:w-72 xl:w-80">
      {renderSearchField()}
    </div>
  );
}
