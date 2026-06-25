import { useState } from "react";
import { Search } from "lucide-react";

import ExploreCommunityShowcase from "./ExploreCommunityShowcase";

export default function ExploreDiscoverStage({ subtitle }: { subtitle: string }) {
  const [query, setQuery] = useState("");

  return (
    <div className="landing-discover">
      <div className="landing-discover__story">
        <div className="landing-discover__story-copy">
          <h2 className="landing-discover__title">
            <span className="landing-discover__title-accent">Find your</span>
            <span className="landing-discover__title-main"> people.</span>
          </h2>
          <p className="landing-discover__text">{subtitle}</p>
        </div>

        <div className="landing-discover__search">
          <label
            className="landing-discover__search-label"
            htmlFor="explore-community-search"
          >
            Search public communities
          </label>
          <div className="landing-discover__search-field">
            <Search
              size={18}
              aria-hidden
              className="landing-discover__search-icon"
            />
            <input
              id="explore-community-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Photography, gaming, local events..."
              className="landing-discover__search-input"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <ExploreCommunityShowcase query={query} />
    </div>
  );
}
