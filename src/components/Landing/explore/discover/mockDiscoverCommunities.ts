export type MockDiscoverCommunity = {
  id: string;
  name: string;
  description: string;
  members: string;
  tags: string[];
  accent: string;
};

/** Test: search this name — it is not in the initial floating ring. */
export const HIDDEN_SHOWCASE_TEST_COMMUNITY_NAME = "Moonlit Chess League";

export const SHOWCASE_INITIAL_COUNT = 7;
export const SHOWCASE_MAX_VISIBLE = 15;

const CATALOG_BASE: Omit<MockDiscoverCommunity, "float">[] = [
  {
    id: "photo-walks",
    name: "City Photo Walks",
    description: "Weekend street photography meetups and critique nights.",
    members: "2.4k members",
    tags: ["photography", "local", "creative"],
    accent: "#f5d76e",
  },
  {
    id: "indie-gamers",
    name: "Indie Gamers Hub",
    description: "Cozy co-op nights, demos, and launch-day watch parties.",
    members: "5.1k members",
    tags: ["gaming", "co-op", "events"],
    accent: "#8b9cf7",
  },
  {
    id: "run-club",
    name: "Sunrise Run Club",
    description: "Tuesday tempo runs and Saturday coffee after the miles.",
    members: "980 members",
    tags: ["fitness", "local", "meetup"],
    accent: "#7ee0b8",
  },
  {
    id: "film-room",
    name: "Late Night Film Room",
    description: "Curated watches, spoiler threads, and director deep dives.",
    members: "1.7k members",
    tags: ["film", "discussion", "creative"],
    accent: "#f29ac8",
  },
  {
    id: "makers-lab",
    name: "Weekend Makers Lab",
    description: "3D prints, synth builds, and show-and-tell project tables.",
    members: "860 members",
    tags: ["makers", "hardware", "projects"],
    accent: "#ffb86b",
  },
  {
    id: "study-hall",
    name: "Open Study Hall",
    description: "Quiet focus rooms, pomodoro sprints, and exam season support.",
    members: "3.2k members",
    tags: ["study", "productivity", "students"],
    accent: "#9ad4ff",
  },
  {
    id: "vinyl-circle",
    name: "Vinyl Listening Circle",
    description: "Album-first listening sessions and crate-digging tips.",
    members: "640 members",
    tags: ["music", "vinyl", "hangout"],
    accent: "#d6a8ff",
  },
  {
    id: "food-map",
    name: "Hidden Food Map",
    description: "Neighborhood gems, pop-up alerts, and budget bite lists.",
    members: "4.4k members",
    tags: ["food", "local", "events"],
    accent: "#ff9f7a",
  },
  {
    id: "climb-crew",
    name: "Indoor Climb Crew",
    description: "Belay partners, route beta, and Friday projection sessions.",
    members: "1.1k members",
    tags: ["climbing", "fitness", "meetup"],
    accent: "#ff7eb3",
  },
  {
    id: "book-river",
    name: "Slow Book River",
    description: "One chapter a week, spoiler-safe threads, calm reading rooms.",
    members: "2.2k members",
    tags: ["books", "reading", "discussion"],
    accent: "#b8e986",
  },
  {
    id: "pixel-art",
    name: "Pixel Art Patio",
    description: "Daily prompts, palette swaps, and tiny animation jams.",
    members: "740 members",
    tags: ["art", "pixel", "creative"],
    accent: "#6ee7ff",
  },
  {
    id: "coffee-cupping",
    name: "Coffee Cupping Club",
    description: "Roast comparisons, brew logs, and cafe crawl maps.",
    members: "520 members",
    tags: ["coffee", "local", "food"],
    accent: "#d4a574",
  },
  {
    id: "lang-exchange",
    name: "Language Exchange Loft",
    description: "Pair calls, accent drills, and travel phrase workshops.",
    members: "3.8k members",
    tags: ["language", "learning", "global"],
    accent: "#7c9cff",
  },
  {
    id: "dog-park",
    name: "Dog Park Dispatch",
    description: "Playdate planning, trainer tips, and trail photo swaps.",
    members: "1.9k members",
    tags: ["pets", "dogs", "local"],
    accent: "#ffd166",
  },
  {
    id: "retro-dev",
    name: "Retro Dev Garage",
    description: "GBA-era specs, shader tricks, and demake challenges.",
    members: "670 members",
    tags: ["gaming", "dev", "retro"],
    accent: "#9ef0b5",
  },
  {
    id: "urban-sketch",
    name: "Urban Sketch Society",
    description: "Plein-air meetups, ink washes, and museum bench sessions.",
    members: "890 members",
    tags: ["art", "sketch", "local"],
    accent: "#f4a261",
  },
  {
    id: "plant-swap",
    name: "Balcony Plant Swap",
    description: "Cutting trades, pest help, and grow-light setup guides.",
    members: "1.3k members",
    tags: ["plants", "garden", "home"],
    accent: "#84cc7a",
  },
  {
    id: "board-night",
    name: "Board Game Night Ops",
    description: "Rules lawyers welcome, newbie tables always open.",
    members: "2.6k members",
    tags: ["boardgames", "social", "events"],
    accent: "#c9a0ff",
  },
  {
    id: "trail-mix",
    name: "Trail Mix Radio",
    description: "Day hike plans, pack lists, and sunrise summit photos.",
    members: "1.5k members",
    tags: ["hiking", "outdoors", "travel"],
    accent: "#7fd4c9",
  },
  {
    id: "open-mic",
    name: "Basement Open Mic",
    description: "Acoustic sets, poetry slots, and low-stakes first timers.",
    members: "430 members",
    tags: ["music", "live", "creative"],
    accent: "#ff8fab",
  },
  {
    id: "ai-builders",
    name: "AI Builders Circle",
    description: "Prompt craft, small automations, and show-your-work demos.",
    members: "6.2k members",
    tags: ["ai", "tech", "builders"],
    accent: "#a5b4fc",
  },
  {
    id: "sourdough",
    name: "Sourdough Science Lab",
    description: "Starter timelines, crumb shots, and oven spring debates.",
    members: "1.8k members",
    tags: ["baking", "food", "science"],
    accent: "#f0c987",
  },
  {
    id: "anime-club",
    name: "Weekly Anime Club",
    description: "Season watches, episode threads, and cosplay WIPs.",
    members: "4.1k members",
    tags: ["anime", "watchparty", "fandom"],
    accent: "#ff6bcb",
  },
  {
    id: "volunteer-map",
    name: "Volunteer Shift Map",
    description: "Local drives, mutual aid runs, and weekend signup boards.",
    members: "920 members",
    tags: ["volunteer", "local", "community"],
    accent: "#90e0a8",
  },
  {
    id: "moonlit-chess-league",
    name: HIDDEN_SHOWCASE_TEST_COMMUNITY_NAME,
    description:
      "Late-night blitz ladders, puzzle storms, and quiet 15|10 study halls.",
    members: "312 members",
    tags: ["chess", "strategy", "night"],
    accent: "#c4b5fd",
  },
  {
    id: "kite-winter",
    name: "Winter Kite Collective",
    description: "Wind forecasts, line care, and wide-field launch meetups.",
    members: "188 members",
    tags: ["kites", "outdoors", "winter"],
    accent: "#93c5fd",
  },
  {
    id: "ceramics-kiln",
    name: "Shared Kiln Society",
    description: "Glaze tests, firing schedules, and studio safety checklists.",
    members: "256 members",
    tags: ["ceramics", "craft", "makers"],
    accent: "#fca5a5",
  },
];

/** Simulates a large directory; the ring only shows a small live subset. */
export const MOCK_DISCOVER_CATALOG: MockDiscoverCommunity[] = CATALOG_BASE;

export const MOCK_DISCOVER_BY_ID = new Map(
  MOCK_DISCOVER_CATALOG.map((c) => [c.id, c])
);

export const INITIAL_SHOWCASE_IDS = MOCK_DISCOVER_CATALOG.filter(
  (c) => c.id !== "moonlit-chess-league"
)
  .slice(0, SHOWCASE_INITIAL_COUNT)
  .map((c) => c.id);

export function matchesDiscoverQuery(
  community: MockDiscoverCommunity,
  query: string
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return community.name.toLowerCase().includes(q);
}

export function searchDiscoverCatalog(query: string) {
  const q = query.trim();
  if (!q) return [];
  return MOCK_DISCOVER_CATALOG.filter((c) => matchesDiscoverQuery(c, q));
}

export function getDiscoverCommunity(id: string) {
  return MOCK_DISCOVER_BY_ID.get(id);
}
