import { Users } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  computeRingLayout,
  computeRingSlots,
  dissolvePullTowardCenter,
  pickEvictionId,
  type ShowcaseRingSlot,
} from "./exploreShowcaseRing";
import {
  getDiscoverCommunity,
  INITIAL_SHOWCASE_IDS,
  matchesDiscoverQuery,
  searchDiscoverCatalog,
  SHOWCASE_MAX_VISIBLE,
  type MockDiscoverCommunity,
} from "./mockDiscoverCommunities";

const SHOWCASE_MAX_VISIBLE_MOBILE = 6;
const SHOWCASE_INITIAL_COUNT_MOBILE = 5;

const ENTER_MS = 720;
const EXIT_MS = 1020;
const SEARCH_DEBOUNCE_MS = 260;

function DiscoverCard({
  community,
  className = "",
  style,
}: {
  community: MockDiscoverCommunity;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className={`landing-discover-card landing-discover-card--floating ${className}`.trim()}
      style={style}
    >
      <div className="landing-discover-card__accent" aria-hidden />
      <h3 className="landing-discover-card__name">{community.name}</h3>
      <p className="landing-discover-card__desc">{community.description}</p>
      <p className="landing-discover-card__meta">
        <Users size={14} aria-hidden />
        <span>{community.members}</span>
      </p>
    </article>
  );
}

export default function ExploreCommunityShowcase({
  query,
}: {
  query: string;
}) {
  const trimmed = query.trim();
  const hasFilter = trimmed.length > 0;

  const [visibleIds, setVisibleIds] = useState<string[]>(() => {
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 900px)").matches;
    return mobile
      ? INITIAL_SHOWCASE_IDS.slice(0, SHOWCASE_INITIAL_COUNT_MOBILE)
      : INITIAL_SHOWCASE_IDS;
  });
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());
  const [viewportTier, setViewportTier] = useState<"mobile" | "desktop">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 900px)").matches
      ? "mobile"
      : "desktop"
  );
  const slotCacheRef = useRef<Map<string, ShowcaseRingSlot>>(new Map());
  const exitSlotsRef = useRef<Map<string, ShowcaseRingSlot>>(new Map());
  const visibleRef = useRef(visibleIds);
  visibleRef.current = visibleIds;

  const isMobile = viewportTier === "mobile";
  const showcaseMaxVisible = isMobile
    ? SHOWCASE_MAX_VISIBLE_MOBILE
    : SHOWCASE_MAX_VISIBLE;

  const liveSlots = useMemo(
    () => computeRingSlots(visibleIds, isMobile),
    [visibleIds, isMobile]
  );

  const ringLayout = useMemo(
    () => computeRingLayout(visibleIds.length, isMobile),
    [visibleIds.length, isMobile]
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => {
      setViewportTier(mq.matches ? "mobile" : "desktop");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    setVisibleIds((prev) =>
      prev.length > showcaseMaxVisible ? prev.slice(0, showcaseMaxVisible) : prev
    );
  }, [isMobile, showcaseMaxVisible]);

  const showcaseStyle = useMemo(
    () =>
      ({
        "--ring-orbit-w": ringLayout.orbitWidth,
        "--ring-orbit-h": ringLayout.orbitHeight,
      }) as CSSProperties,
    [ringLayout]
  );

  useEffect(() => {
    liveSlots.forEach((slot, id) => {
      slotCacheRef.current.set(id, slot);
    });
  }, [liveSlots]);

  const catalogMatches = useMemo(
    () => (hasFilter ? searchDiscoverCatalog(trimmed) : []),
    [hasFilter, trimmed]
  );

  useEffect(() => {
    if (!hasFilter) return;

    const timer = window.setTimeout(() => {
      const searchQuery = trimmed;
      const matches = searchDiscoverCatalog(searchQuery);
      const protect = (id: string) => {
        const community = getDiscoverCommunity(id);
        return community ? matchesDiscoverQuery(community, searchQuery) : false;
      };

      let next = [...visibleRef.current];
      const entering: string[] = [];
      const exiting: string[] = [];

      for (const match of matches) {
        if (next.includes(match.id)) continue;

        if (next.length >= showcaseMaxVisible) {
          const slots = computeRingSlots(next, isMobile);
          const evictId = pickEvictionId(next, slots, protect);
          if (!evictId) continue;
          const evictSlots = computeRingSlots(visibleRef.current, isMobile);
          const frozen = evictSlots.get(evictId);
          if (frozen) exitSlotsRef.current.set(evictId, frozen);
          exiting.push(evictId);
          next = next.filter((id) => id !== evictId);
        }

        next.push(match.id);
        entering.push(match.id);
      }

      if (entering.length === 0) return;

      if (exiting.length > 0) {
        setExitingIds((prev) => {
          const s = new Set(prev);
          for (const id of exiting) s.add(id);
          return s;
        });
        window.setTimeout(() => {
          setExitingIds((prev) => {
            const s = new Set(prev);
            for (const id of exiting) s.delete(id);
            return s;
          });
          for (const id of exiting) exitSlotsRef.current.delete(id);
        }, EXIT_MS);
      }

      setEnteringIds((prev) => {
        const s = new Set(prev);
        for (const id of entering) s.add(id);
        return s;
      });
      window.setTimeout(() => {
        setEnteringIds((prev) => {
          const s = new Set(prev);
          for (const id of entering) s.delete(id);
          return s;
        });
      }, ENTER_MS);

      setVisibleIds(next);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmed, hasFilter, isMobile, showcaseMaxVisible]);

  const renderIds = useMemo(() => {
    const ids = [...visibleIds];
    Array.from(exitingIds).forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
    return ids;
  }, [visibleIds, exitingIds]);

  const hasCatalogMatch = catalogMatches.length > 0;

  return (
    <div
      className="landing-discover__showcase"
      style={showcaseStyle}
      aria-label="Featured communities preview"
    >
      <div className="landing-discover__showcase-aura" aria-hidden>
        <div className="landing-discover__showcase-glow landing-discover__showcase-glow--halo" />
        <div className="landing-discover__showcase-glow landing-discover__showcase-glow--core" />
        <div className="landing-discover__showcase-orbit landing-discover__showcase-orbit--outer" />
        <div className="landing-discover__showcase-orbit landing-discover__showcase-orbit--main">
          <span className="landing-discover__showcase-sweep" />
        </div>
        <div className="landing-discover__showcase-orbit landing-discover__showcase-orbit--inner" />
        <div
          className="landing-discover__showcase-spark"
          style={{ "--spark-delay": "-2s" } as CSSProperties}
        />
        <div
          className="landing-discover__showcase-spark landing-discover__showcase-spark--reverse"
          style={{ "--spark-delay": "-7s" } as CSSProperties}
        />
        <div
          className="landing-discover__showcase-spark landing-discover__showcase-spark--wide"
          style={{ "--spark-delay": "-12s" } as CSSProperties}
        />
      </div>

      <div className="landing-discover__pile">
        {renderIds.map((id) => {
          const community = getDiscoverCommunity(id);
          const isExiting = exitingIds.has(id);
          const slot = isExiting
            ? (exitSlotsRef.current.get(id) ??
              slotCacheRef.current.get(id) ??
              null)
            : (liveSlots.get(id) ?? slotCacheRef.current.get(id) ?? null);
          if (!community || !slot) return null;

          const isEntering = enteringIds.has(id);
          const isMatch = matchesDiscoverQuery(community, trimmed);

          const isDimmed = hasFilter && !isMatch && !isExiting;
          const dissolve = isExiting ? dissolvePullTowardCenter(slot) : null;

          return (
            <div
              key={id}
              className={[
                "landing-discover-card-wrap",
                isEntering ? "is-entering" : "",
                isExiting ? "is-exiting" : "",
                isDimmed ? "is-dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--slot-top": slot.top,
                  "--slot-left": slot.left,
                  "--enter-top": slot.enterTop,
                  "--enter-left": slot.enterLeft,
                  top: slot.top,
                  left: slot.left,
                } as CSSProperties
              }
            >
              <DiscoverCard
                community={community}
                className={[
                  isEntering ? "is-entering" : "",
                  isExiting ? "is-exiting" : "",
                  hasFilter ? (isMatch ? "is-match" : "is-dimmed") : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    "--card-rotate": `${slot.rotate}deg`,
                    "--card-delay": slot.delay,
                    "--card-duration": slot.duration,
                    "--card-drift": slot.drift,
                    "--card-accent": community.accent,
                    "--dissolve-x": dissolve?.x ?? "0%",
                    "--dissolve-y": dissolve?.y ?? "0%",
                  } as CSSProperties
                }
              />
            </div>
          );
        })}
      </div>

      {hasFilter && !hasCatalogMatch && (
        <p className="landing-discover__showcase-empty">
          No public communities match that search.
        </p>
      )}
    </div>
  );
}
