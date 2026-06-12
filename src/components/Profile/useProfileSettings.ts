import { useCallback, useEffect, useRef, useState } from "react";
import { findPlacement, findPlacementAtCell } from "../ProfileCard/gridUtils";
import { ProfileCardLayout, ProfileWidget, WidgetType } from "../ProfileCard/types";
import { SocialPlatform, SOCIAL_PLATFORMS } from "../Profile/socialPlatforms";
import { ProfileBasics, SocialLink, sanitizeBio } from "../Profile/types";
import {
  getProfileSettings,
  updateProfileSettings,
} from "../../services/profileSettingsService";

const basicsStorageKey = (userId: number) => `sebetpage-profile-basics-${userId}`;
const cardStorageKey = (userId: number) => `sebetpage-profile-card-${userId}`;

const EMPTY_BASICS: ProfileBasics = { bio: "", socialLinks: [] };
const EMPTY_CARD: ProfileCardLayout = { widgets: [] };

function dedupeSocialLinks(links: SocialLink[]): SocialLink[] {
  const validPlatforms = new Set(SOCIAL_PLATFORMS.map((p) => p.id));
  const byPlatform = new Map<SocialPlatform, SocialLink>();
  for (const link of links) {
    if (link.platform && validPlatforms.has(link.platform)) {
      byPlatform.set(link.platform, link);
    }
  }
  return Array.from(byPlatform.values());
}

function loadLocalBasics(userId: number): ProfileBasics | null {
  try {
    const raw = localStorage.getItem(basicsStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileBasics;
    return {
      bio: sanitizeBio(typeof parsed.bio === "string" ? parsed.bio : ""),
      socialLinks: dedupeSocialLinks(
        Array.isArray(parsed.socialLinks) ? parsed.socialLinks : []
      ),
    };
  } catch {
    return null;
  }
}

function loadLocalCard(userId: number): ProfileCardLayout | null {
  try {
    const raw = localStorage.getItem(cardStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileCardLayout;
    if (!Array.isArray(parsed.widgets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearLocalProfile(userId: number) {
  localStorage.removeItem(basicsStorageKey(userId));
  localStorage.removeItem(cardStorageKey(userId));
}

function isEmptySettings(basics: ProfileBasics, card: ProfileCardLayout): boolean {
  return !basics.bio.trim() && basics.socialLinks.length === 0 && card.widgets.length === 0;
}

function newLinkId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newWidgetId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface UseProfileSettingsOptions {
  editable?: boolean;
  enabled?: boolean;
}

export function useProfileSettings(userId: number, options: UseProfileSettingsOptions = {}) {
  const { editable = false, enabled = true } = options;
  const [bio, setBioState] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [widgets, setWidgets] = useState<ProfileWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef({ bio: "", socialLinks: [] as SocialLink[], widgets: [] as ProfileWidget[] });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  stateRef.current = { bio, socialLinks, widgets };

  const persist = useCallback(async () => {
    if (!editable) return;
    const snapshot = stateRef.current;
    setSaving(true);
    setError(null);
    try {
      await updateProfileSettings({
        bio: snapshot.bio,
        socialLinks: snapshot.socialLinks,
        profileCard: { widgets: snapshot.widgets },
      });
    } catch {
      setError("Could not save profile settings.");
    } finally {
      setSaving(false);
    }
  }, [editable]);

  const scheduleSave = useCallback(() => {
    if (!editable || !hydratedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 500);
  }, [editable, persist]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    hydratedRef.current = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        let data = await getProfileSettings(userId);
        let nextBasics: ProfileBasics = {
          bio: sanitizeBio(data.bio),
          socialLinks: dedupeSocialLinks(data.socialLinks),
        };
        let nextCard = data.profileCard ?? EMPTY_CARD;

        if (editable && isEmptySettings(nextBasics, nextCard)) {
          const localBasics = loadLocalBasics(userId);
          const localCard = loadLocalCard(userId);
          if (localBasics || localCard) {
            nextBasics = localBasics ?? EMPTY_BASICS;
            nextCard = localCard ?? EMPTY_CARD;
            data = await updateProfileSettings({
              bio: nextBasics.bio,
              socialLinks: nextBasics.socialLinks,
              profileCard: nextCard,
            });
            clearLocalProfile(userId);
            nextBasics = {
              bio: sanitizeBio(data.bio),
              socialLinks: dedupeSocialLinks(data.socialLinks),
            };
            nextCard = data.profileCard ?? EMPTY_CARD;
          }
        }

        if (cancelled) return;
        setBioState(nextBasics.bio);
        setSocialLinks(nextBasics.socialLinks);
        setWidgets(nextCard.widgets);
        hydratedRef.current = true;
      } catch {
        if (!cancelled) setError("Could not load profile settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [userId, editable, enabled]);

  const setBio = useCallback(
    (value: string) => {
      setBioState(sanitizeBio(value));
      scheduleSave();
    },
    [scheduleSave]
  );

  const addSocialLink = useCallback(
    (platform: SocialPlatform, url: string) => {
      setSocialLinks((prev) => {
        const withoutPlatform = prev.filter((link) => link.platform !== platform);
        const next: SocialLink = { id: newLinkId(), platform, url };
        return dedupeSocialLinks([...withoutPlatform, next]);
      });
      scheduleSave();
    },
    [scheduleSave]
  );

  const updateSocialLink = useCallback(
    (id: string, url: string) => {
      setSocialLinks((prev) =>
        prev.map((link) => (link.id === id ? { ...link, url } : link))
      );
      scheduleSave();
    },
    [scheduleSave]
  );

  const removeSocialLink = useCallback(
    (id: string) => {
      setSocialLinks((prev) => prev.filter((link) => link.id !== id));
      scheduleSave();
    },
    [scheduleSave]
  );

  const addWidget = useCallback(
    (type: WidgetType, at?: { x: number; y: number }) => {
      setWidgets((prevWidgets) => {
        let placement: { x: number; y: number; w: number; h: number } | null = null;

        if (at) {
          placement = findPlacementAtCell(prevWidgets, type, at);
        }

        if (!placement) {
          placement = findPlacement(prevWidgets, type);
        }

        if (!placement) return prevWidgets;

        const next: ProfileWidget = {
          id: newWidgetId(),
          type,
          ...placement,
        };

        return [...prevWidgets, next];
      });
      scheduleSave();
    },
    [scheduleSave]
  );

  const removeWidget = useCallback(
    (id: string) => {
      setWidgets((prev) => prev.filter((widget) => widget.id !== id));
      scheduleSave();
    },
    [scheduleSave]
  );

  const updateWidget = useCallback(
    (id: string, patch: Partial<ProfileWidget>) => {
      setWidgets((prev) =>
        prev.map((widget) => (widget.id === id ? { ...widget, ...patch } : widget))
      );
      scheduleSave();
    },
    [scheduleSave]
  );

  return {
    bio,
    socialLinks,
    widgets,
    isEmpty: widgets.length === 0,
    loading,
    saving,
    error,
    setBio,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    addWidget,
    removeWidget,
    updateWidget,
  };
}
