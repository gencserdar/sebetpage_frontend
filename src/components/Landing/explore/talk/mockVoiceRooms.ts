export type VoiceRoomParticipant = {
  id: string;
  name: string;
  avatar: string;
};

export type MockVoiceRoom = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  liveLabel: string;
  participants: VoiceRoomParticipant[];
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/personas/png?seed=${encodeURIComponent(seed)}&size=128`;

export const MOCK_VOICE_ROOMS: MockVoiceRoom[] = [
  {
    id: "gaming",
    name: "Gaming crew",
    tagline: "Ranked queue, callouts, and post-game debriefs.",
    accent: "#8b9cff",
    liveLabel: "6 in voice",
    participants: [
      { id: "g1", name: "Kai", avatar: avatar("kai-gaming") },
      { id: "g2", name: "Mina", avatar: avatar("mina-gaming") },
      { id: "g3", name: "Omar", avatar: avatar("omar-gaming") },
      { id: "g4", name: "Jules", avatar: avatar("jules-gaming") },
      { id: "g5", name: "Rin", avatar: avatar("rin-gaming") },
    ],
  },
  {
    id: "study",
    name: "Late-night study",
    tagline: "Quiet focus with soft check-ins every hour.",
    accent: "#9eb8a8",
    liveLabel: "4 in voice",
    participants: [
      { id: "s1", name: "Ava", avatar: avatar("ava-study") },
      { id: "s2", name: "Leo", avatar: avatar("leo-study") },
      { id: "s3", name: "Noah", avatar: avatar("noah-study") },
      { id: "s4", name: "Iris", avatar: avatar("iris-study") },
    ],
  },
  {
    id: "open-mic",
    name: "Open mic",
    tagline: "Poetry, demos, and whatever is on your mind.",
    accent: "#c4a4d8",
    liveLabel: "8 in voice",
    participants: [
      { id: "m1", name: "Zoe", avatar: avatar("zoe-mic") },
      { id: "m2", name: "Theo", avatar: avatar("theo-mic") },
      { id: "m3", name: "Lena", avatar: avatar("lena-mic") },
      { id: "m4", name: "Dex", avatar: avatar("dex-mic") },
      { id: "m5", name: "Sage", avatar: avatar("sage-mic") },
      { id: "m6", name: "Paz", avatar: avatar("paz-mic") },
    ],
  },
];

export function getVoiceRoom(id: string) {
  return MOCK_VOICE_ROOMS.find((room) => room.id === id) ?? MOCK_VOICE_ROOMS[0];
}
