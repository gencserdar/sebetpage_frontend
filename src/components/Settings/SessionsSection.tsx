import { useCallback, useEffect, useState } from "react";
import { LogOut, Monitor, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  listSessions,
  logoutAll,
  revokeSession,
  SessionDTO,
} from "../../services/sessionService";
import SettingsSectionHeader from "./SettingsSectionHeader";

function formatSessionDate(millis: number): string {
  try {
    return new Date(millis).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export default function SessionsSection() {
  const { logout } = useUser();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<"others" | "everywhere" | null>(null);
  const [confirmRevokeCurrent, setConfirmRevokeCurrent] = useState<SessionDTO | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSessions(await listSessions());
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async (session: SessionDTO) => {
    if (session.current) {
      setConfirmRevokeCurrent(session);
      return;
    }
    try {
      setRevokingId(session.id);
      await revokeSession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      console.error("Failed to revoke session:", err);
      setError("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const confirmRevokeCurrentSession = async () => {
    if (!confirmRevokeCurrent) return;
    try {
      setRevokingId(confirmRevokeCurrent.id);
      await revokeSession(confirmRevokeCurrent.id);
      await logout();
      navigate("/?login=1", { replace: true });
    } catch (err) {
      console.error("Failed to revoke current session:", err);
      setError("Failed to sign out this device");
    } finally {
      setRevokingId(null);
      setConfirmRevokeCurrent(null);
    }
  };

  const handleLogoutOthers = async () => {
    try {
      setBulkAction("others");
      await logoutAll({ excludeCurrent: true });
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      console.error("Failed to sign out other devices:", err);
      setError("Failed to sign out other devices");
    } finally {
      setBulkAction(null);
    }
  };

  const handleLogoutEverywhere = async () => {
    try {
      setBulkAction("everywhere");
      await logoutAll({ excludeCurrent: false });
      await logout();
      navigate("/?login=1", { replace: true });
    } catch (err) {
      console.error("Failed to sign out everywhere:", err);
      setError("Failed to sign out everywhere");
    } finally {
      setBulkAction(null);
    }
  };

  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div>
      <SettingsSectionHeader
        title="Sessions"
        description="Review devices where you're signed in and revoke access you don't recognize."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/20 p-4 backdrop-blur-sm">
          <p className="text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
          <span className="ml-3 text-gray-400">Loading sessions...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
            <Monitor className="text-gray-500" size={26} />
          </div>
          <h3 className="text-lg font-semibold text-white">No active sessions</h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            You are not signed in on any devices.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 max-w-2xl space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {session.current ? "This device" : `Session #${session.id}`}
                    </span>
                    {session.current && (
                      <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">
                        Current
                      </span>
                    )}
                    {session.rememberMe && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                        Remember me
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    Signed in {formatSessionDate(session.createdAtMillis)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Expires {formatSessionDate(session.expiresAtMillis)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevoke(session)}
                  disabled={revokingId === session.id || bulkAction !== null}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {revokingId === session.id ? "Revoking..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>

          <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleLogoutOthers()}
              disabled={otherSessions.length === 0 || bulkAction !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldAlert size={16} />
              {bulkAction === "others" ? "Signing out..." : "Sign out all other devices"}
            </button>
            <button
              type="button"
              onClick={() => void handleLogoutEverywhere()}
              disabled={bulkAction !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={16} />
              {bulkAction === "everywhere" ? "Signing out..." : "Sign out everywhere"}
            </button>
          </div>
        </>
      )}

      {confirmRevokeCurrent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
            <h3 className="mb-4 text-xl font-bold text-white">Sign out this device?</h3>
            <p className="mb-6 leading-relaxed text-gray-200">
              Revoking this session will sign you out on this device immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRevokeCurrent(null)}
                className="rounded-lg bg-white/10 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRevokeCurrentSession()}
                className="rounded-lg bg-red-600/80 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-red-600"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
