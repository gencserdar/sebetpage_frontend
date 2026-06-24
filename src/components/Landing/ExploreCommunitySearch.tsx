import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  searchPublicCommunities,
  type PublicCommunity,
} from "../../services/communityService";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 280;

export default function ExploreCommunitySearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const rows = await searchPublicCommunities(trimmed);
        if (seq !== requestSeq.current) return;
        setResults(rows);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setFailed(true);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();
  const showHint = trimmed.length > 0 && trimmed.length < MIN_QUERY;
  const showEmpty =
    !loading && !failed && trimmed.length >= MIN_QUERY && results.length === 0;
  const isExpanded =
    trimmed.length > 0 || loading || failed || results.length > 0;

  return (
    <div
      className={`landing-section__community-search landing-community-search__panel${
        isExpanded ? " is-expanded" : ""
      }`}
    >
      <label
        className="landing-community-search__label"
        htmlFor="explore-community-search"
      >
        Search public communities
      </label>
      <div className="landing-community-search__field">
        <Search
          size={18}
          aria-hidden
          className="landing-community-search__icon"
        />
        <input
          id="explore-community-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Photography, gaming, local events..."
          className="landing-community-search__input"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="landing-community-search__body">
        <div className="landing-community-search__body-inner">
          {loading && (
            <p className="landing-community-search__status">Searching...</p>
          )}
          {showHint && (
            <p className="landing-community-search__status">
              Type at least {MIN_QUERY} characters.
            </p>
          )}
          {failed && (
            <p className="landing-community-search__status landing-community-search__status--error">
              Could not load communities. Try again in a moment.
            </p>
          )}
          {showEmpty && (
            <p className="landing-community-search__status">
              No public communities match that search.
            </p>
          )}

          {results.length > 0 && (
            <ul className="landing-community-search__list" role="listbox">
              {results.map((community) => (
                <li key={community.id}>
                  <button
                    type="button"
                    className="landing-community-search__item"
                    role="option"
                    onClick={() => navigate(`/community/${community.id}`)}
                  >
                    <span className="landing-community-search__name">
                      {community.name}
                    </span>
                    {community.description ? (
                      <span className="landing-community-search__desc">
                        {community.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
