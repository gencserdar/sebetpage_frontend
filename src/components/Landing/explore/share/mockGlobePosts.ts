export type GlobePost = {
  id: string;
  username: string;
  avatar: string;
  text: string;
  image?: string;
  lat: number;
  lon: number;
  place: string;
  country: string;
};

const publicUrl = (path: string) =>
  `${process.env.PUBLIC_URL ?? ""}${path}`;

/**
 * LOCAL POST IMAGES — put your JPG/WEBP files here:
 *   src/frontend/public/globe-posts/
 *
 * Filenames must match the `image` field below (see GLOBE_POST_IMAGE_FILES).
 * Avatars use Dicebear URLs (online). Only Istanbul uses local profile photos.
 */
const postImg = (file: string) => publicUrl(`/globe-posts/${file}`);

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/personas/png?seed=${encodeURIComponent(seed)}&size=128`;

const DEFAULT_PP = publicUrl("/default_pp.png");
const SERDAR_PP = publicUrl("/serdargenc_pp.png");

/** Reference list — download these themed photos into public/globe-posts/ */
export const GLOBE_POST_IMAGE_FILES = {
  "egypt.jpg": "Giza pyramids at sunset",
  "japan.jpg": "Fushimi Inari torii / Kyoto",
  "brazil.jpg": "Sugarloaf / Rio sunset",
  "france.jpg": "Eiffel Tower / Paris",
  "usa.jpg": "Manhattan skyline at night",
  "iceland.jpg": "Northern lights over Reykjavik",
  "kenya.jpg": "Lion on the Maasai Mara",
  "india.jpg": "Taj Mahal at dawn",
  "australia.jpg": "Sydney Opera House",
  "italy.jpg": "Colosseum / Rome",
  "morocco.jpg": "Sahara dunes near Merzouga",
  "norway.jpg": "Geirangerfjord kayaking",
  "mexico.jpg": "Tacos al pastor",
  "thailand.jpg": "Yi Peng lanterns / Chiang Mai",
  "south-africa.jpg": "Table Mountain / Cape Town",
  "peru.jpg": "Machu Picchu in morning mist",
} as const;

export const MOCK_GLOBE_POSTS: GlobePost[] = [
  {
    id: "egypt-pyramids",
    username: "nour_elmasry",
    avatar: avatar("nour_elmasry"),
    text: "الغروب عند الأهرامات. لا يُصدّق.",
    image: postImg("egypt.jpg"),
    lat: 29.9792,
    lon: 31.1342,
    place: "Giza",
    country: "Egypt",
  },
  {
    id: "japan-kyoto",
    username: "hana_mori",
    avatar: avatar("hana_mori"),
    text: "伏見稲荷の静かな朝。",
    image: postImg("japan.jpg"),
    lat: 34.9671,
    lon: 135.7727,
    place: "Kyoto",
    country: "Japan",
  },
  {
    id: "brazil-rio",
    username: "lucas_carioca",
    avatar: avatar("lucas_carioca"),
    text: "Pôr do sol no Pão de Açúcar.",
    image: postImg("brazil.jpg"),
    lat: -22.9519,
    lon: -43.2105,
    place: "Rio de Janeiro",
    country: "Brazil",
  },
  {
    id: "france-paris",
    username: "camille_r",
    avatar: avatar("camille_r"),
    text: "",
    image: postImg("france.jpg"),
    lat: 48.8566,
    lon: 2.3522,
    place: "Paris",
    country: "France",
  },
  {
    id: "usa-nyc",
    username: "jordan_kline",
    avatar: avatar("jordan_kline"),
    text: "Midtown view never get old.",
    image: postImg("usa.jpg"),
    lat: 40.758,
    lon: -73.9855,
    place: "New York",
    country: "United States",
  },
  {
    id: "iceland",
    username: "sigrid_n",
    avatar: avatar("sigrid_n"),
    text: "Northern lights over my tent tonight.",
    image: postImg("iceland.jpg"),
    lat: 64.1466,
    lon: -21.9426,
    place: "Reykjavik",
    country: "Iceland",
  },
  {
    id: "kenya",
    username: "amara_wild",
    avatar: avatar("amara_wild"),
    text: "First lion sighting on the Mara.",
    image: postImg("kenya.jpg"),
    lat: -1.4061,
    lon: 35.0187,
    place: "Maasai Mara",
    country: "Kenya",
  },
  {
    id: "india-agra",
    username: "priya_shah",
    avatar: avatar("priya_shah"),
    text: "सुबह ताज महल — उठना सार्थक था।",
    image: postImg("india.jpg"),
    lat: 27.1751,
    lon: 78.0421,
    place: "Agra",
    country: "India",
  },
  {
    id: "australia-sydney",
    username: "liam_coastal",
    avatar: avatar("liam_coastal"),
    text: "Opera House before the show.",
    image: postImg("australia.jpg"),
    lat: -33.8568,
    lon: 151.2153,
    place: "Sydney",
    country: "Australia",
  },
  {
    id: "italy-rome",
    username: "giulia_b",
    avatar: avatar("giulia_b"),
    text: "",
    image: postImg("italy.jpg"),
    lat: 41.8902,
    lon: 12.4922,
    place: "Rome",
    country: "Italy",
  },
  {
    id: "morocco",
    username: "yasmine_sahara",
    avatar: avatar("yasmine_sahara"),
    text: "Coffee and dunes outside Merzouga.",
    image: postImg("morocco.jpg"),
    lat: 31.0994,
    lon: -4.0127,
    place: "Merzouga",
    country: "Morocco",
  },
  {
    id: "norway",
    username: "ole_fjord",
    avatar: avatar("ole_fjord"),
    text: "My favourite view.",
    image: postImg("norway.jpg"),
    lat: 62.1015,
    lon: 7.0942,
    place: "Geiranger",
    country: "Norway",
  },
  {
    id: "mexico-cdmx",
    username: "mateo_street",
    avatar: avatar("mateo_street"),
    text: "Tacos al pastor después del mercado.",
    image: postImg("mexico.jpg"),
    lat: 19.4326,
    lon: -99.1332,
    place: "Mexico City",
    country: "Mexico",
  },
  {
    id: "thailand",
    username: "nattaya_bkk",
    avatar: avatar("nattaya_bkk"),
    text: "โคมลอยเหนือเชียงใหม่",
    image: postImg("thailand.jpg"),
    lat: 18.7883,
    lon: 98.9853,
    place: "Chiang Mai",
    country: "Thailand",
  },
  {
    id: "south-africa",
    username: "thabo_cpt",
    avatar: avatar("thabo_cpt"),
    text: "Table Mountain cleared after the clouds.",
    image: postImg("south-africa.jpg"),
    lat: -33.9628,
    lon: 18.4098,
    place: "Cape Town",
    country: "South Africa",
  },
  {
    id: "peru",
    username: "valeria_andes",
    avatar: avatar("valeria_andes"),
    text: "This view and Machu Picchu from The Strokes!",
    image: postImg("peru.jpg"),
    lat: -13.1631,
    lon: -72.545,
    place: "Cusco Region",
    country: "Peru",
  },
  {
    id: "turkey-istanbul",
    username: "serdargenc",
    avatar: SERDAR_PP,
    text: "sebet yapioz",
    image: DEFAULT_PP,
    lat: 41.0082,
    lon: 28.9784,
    place: "Istanbul",
    country: "Turkey",
  },
];

export const MOCK_GLOBE_POST_BY_ID = new Map(
  MOCK_GLOBE_POSTS.map((p) => [p.id, p])
);
