import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ProfilePopup from "../components/ProfilePopup/index";
import { useChatSocketContext } from "../context/ChatSocketContext";
import { useProfileNavigation, ProfileNavState } from "../hooks/useProfileNavigation";
import { getUserById, getUserByNickname } from "../services/userService";
import { UserDTO } from "../types/userDTO";

export default function ProfilePopupRoute() {
  const { nickname } = useParams<{ nickname: string }>();
  const location = useLocation();
  const { closeProfile, replaceProfileNickname } = useProfileNavigation();
  const { subscribeUserUpdates } = useChatSocketContext();

  const [profileUser, setProfileUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!nickname) return;

    setLoading(true);
    try {
      const userData = await getUserByNickname(nickname);
      setProfileUser(userData);
    } catch (error) {
      const fallbackId = (location.state as ProfileNavState | null)?.fallbackId;
      if (fallbackId) {
        try {
          const fresh = await getUserById(fallbackId);
          setProfileUser(fresh);
          if (fresh.nickname && fresh.nickname !== nickname) {
            replaceProfileNickname(fresh.nickname);
          }
          return;
        } catch (e2) {
          console.error("Profile fallback by id failed:", e2);
        }
      }
      console.error("Failed to fetch user profile:", error);
      closeProfile();
    } finally {
      setLoading(false);
    }
  }, [nickname, location.state, closeProfile, replaceProfileNickname]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const unsub = subscribeUserUpdates((u: Partial<UserDTO> & { id: number }) => {
      const uid = Number(u.id);
      setProfileUser((prev) => {
        if (!prev || prev.id !== uid) return prev;

        void getUserById(uid)
          .then((fresh) => {
            setProfileUser(fresh);
            if (nickname && fresh.nickname && fresh.nickname !== nickname) {
              replaceProfileNickname(fresh.nickname);
            }
          })
          .catch(() => {
            const next = { ...prev, ...u };
            if (nickname && prev.nickname === nickname && u.nickname && u.nickname !== nickname) {
              replaceProfileNickname(u.nickname);
            }
            setProfileUser(next);
          });

        return { ...prev, ...u };
      });
    });
    return () => unsub();
  }, [subscribeUserUpdates, nickname, replaceProfileNickname]);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm sm:p-6">
        <div className="flex h-[calc(100dvh-3.5rem)] w-full max-w-5xl items-center justify-center rounded-[1.75rem] border border-white/15 bg-[#101018]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:h-[min(740px,calc(100dvh-4rem))]">
          <div className="flex items-center gap-3 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <span>Loading profile...</span>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!profileUser) {
    return null;
  }

  return <ProfilePopup user={profileUser} onClose={closeProfile} />;
}
