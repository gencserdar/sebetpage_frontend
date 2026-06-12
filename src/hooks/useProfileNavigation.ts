import { useCallback } from "react";
import { Location, useLocation, useNavigate } from "react-router-dom";

export interface ProfileNavState {
  backgroundLocation?: Location;
  fallbackId?: number;
}

export function useProfileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const openProfile = useCallback(
    (nickname: string, fallbackId?: number) => {
      navigate(`/profile/${nickname}`, {
        state: {
          backgroundLocation: location,
          fallbackId,
        } satisfies ProfileNavState,
      });
    },
    [navigate, location]
  );

  const closeProfile = useCallback(() => {
    const state = location.state as ProfileNavState | null;
    if (state?.backgroundLocation) {
      navigate(state.backgroundLocation, { replace: true });
      return;
    }
    if (location.pathname.startsWith("/profile/")) {
      navigate("/", { replace: true });
    }
  }, [navigate, location]);

  const replaceProfileNickname = useCallback(
    (newNickname: string) => {
      navigate(`/profile/${newNickname}`, {
        replace: true,
        state: location.state,
      });
    },
    [navigate, location]
  );

  return { openProfile, closeProfile, replaceProfileNickname };
}
