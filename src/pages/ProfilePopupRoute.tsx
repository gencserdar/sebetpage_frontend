import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ProfilePopup from "../components/ProfilePopup/index";
import { ProfilePopupLoadingShell } from "../components/ProfilePopup/ProfilePopupLoadingShell";
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
    return <ProfilePopupLoadingShell />;
  }

  if (!profileUser) {
    return null;
  }

  return <ProfilePopup user={profileUser} onClose={closeProfile} />;
}
