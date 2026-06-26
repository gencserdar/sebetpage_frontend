export type DemoPerson = {
  id: string;
  name: string;
  avatar: string;
  role: string;
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/personas/png?seed=${encodeURIComponent(seed)}&size=128`;

export const DEMO_HOST = {
  id: "john",
  name: "John",
  avatar: avatar("john-host"),
};

/** Persona shown in the invite inbox below the calendar. */
export const DEMO_RECIPIENT: DemoPerson = {
  id: "maya",
  name: "Maya",
  avatar: avatar("maya-chen"),
  role: "Friend",
};

export const DEMO_INVITEES: DemoPerson[] = [
  DEMO_RECIPIENT,
  {
    id: "jordan",
    name: "Jordan",
    avatar: avatar("jordan-lee"),
    role: "Gaming crew",
  },
  {
    id: "sam",
    name: "Sam",
    avatar: avatar("sam-rivera"),
    role: "Study group",
  },
  {
    id: "alex",
    name: "Alex",
    avatar: avatar("alex-kim"),
    role: "Neighbors",
  },
  {
    id: "riley",
    name: "Riley",
    avatar: avatar("riley-park"),
    role: "Photography",
  },
];
