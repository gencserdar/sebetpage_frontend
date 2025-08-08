import { useUser } from "../../context/UserContext";
import SearchBar from "./SearchBar";
import FriendRequestsDropdown from "./FriendRequestsDropdown";
import UserMenu from "./UserMenu";

interface NavbarProps {
  onAuthClick: () => void;
  shiftRight?: boolean;
}


export default function Navbar({ onAuthClick }: NavbarProps) {
  const { user, loading } = useUser();

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 relative">
      {/* Logo Section */}
      <div className="flex items-center space-x-3">
        <img src="/img4.png" alt="SebetPage Logo" className="w-20 h-20" />
        <span className="text-3xl font-bold tracking-tight mb-2 bg-white bg-clip-text text-transparent">
          SebetPage
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="space-x-8 text-lg mr-auto ml-40">
        <a href="#" className="hover:text-pink-400 transition-colors">Friends</a>
        <a href="#" className="hover:text-purple-400 transition-colors">Explore</a>
        <a href="#" className="hover:text-orange-400 transition-colors">Community</a>
      </nav>

      {/* Right Side - Auth/User controls */}
      <div className="flex items-center">
        {/* Friend Requests Dropdown - Only show when user is logged in */}
        {user && !loading && <FriendRequestsDropdown />}

        {/* Search Bar - Only show when user is logged in */}
        {user && !loading && <SearchBar />}

        {/* User Menu */}
        <UserMenu onAuthClick={onAuthClick} />
      </div>
    </header>
  );
}