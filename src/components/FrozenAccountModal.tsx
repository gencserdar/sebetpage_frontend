import { useState } from "react";
import { useUser } from "../context/UserContext";
import { unfreezeAccount } from "../services/profileService";

export default function FrozenAccountModal() {
  const { user, logout, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user?.frozen) return null;

  const handleUnfreeze = async () => {
    setLoading(true);
    setError(null);
    try {
      await unfreezeAccount();
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="text-2xl font-bold text-white mb-3">Your account is frozen</h2>
        <p className="text-gray-300 mb-6">
          Do you want to unfreeze your account or log out?
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleUnfreeze}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Unfreeze"}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            disabled={loading}
            className="flex-1 rounded-lg border border-white/20 px-4 py-3 font-medium text-gray-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
