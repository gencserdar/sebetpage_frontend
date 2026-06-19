import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  HeartHandshake,
  Layers,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  HERO_DIR_LOCK_PX,
  HERO_SWIPE_THRESHOLD,
  collectRippleSeeds,
  createHeroEngine,
  hitTestTriangle,
  loadHeroImage,
  markHeroStroke,
  markHeroTile,
  paintHero,
  requestHeroPaint,
  resetHeroFlips,
  resizeHeroEngine,
  startHeroRipple,
  wrapNext,
  wrapPrev,
  type HeroEngine,
} from "./triangleHeroEngine";

const landingImages = [
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85",
    label: "Friends together",
  },
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=85",
    label: "A team that clicks",
  },
  {
    src: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1600&q=85",
    label: "Real conversations",
  },
  {
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=85",
    label: "Communities that gather",
  },
];

const featureCards = [
  {
    icon: MessageCircle,
    title: "Conversations that flow",
    text: "Direct chats with live typing and seen states, so talking never feels like waiting.",
  },
  {
    icon: Users,
    title: "Circles, not crowds",
    text: "Spin up private groups in seconds and keep your closest people in one place.",
  },
  {
    icon: Layers,
    title: "Profiles with depth",
    text: "Show who you are with a profile people actually want to scroll through.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    text: "Block, freeze, delete, and manage every active session whenever you want.",
  },
];

function TriangleHero({ onLoginClick }: { onLoginClick: () => void }) {
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const draggingRef = useRef(false);
  const ripplingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);
  const lockedPeekRef = useRef<number | null>(null);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const indexRef = useRef(0);

  const count = landingImages.length;
  indexRef.current = index;

  const setEngineImages = useCallback((frontIdx: number, backIdx: number) => {
    const engine = engineRef.current;
    const imgs = imagesRef.current;
    if (!engine || !imgs[frontIdx] || !imgs[backIdx]) return;
    engine.frontImg = imgs[frontIdx];
    engine.backImg = imgs[backIdx];
    requestHeroPaint(engine);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createHeroEngine(canvas);
    engineRef.current = engine;

    const onResize = () => {
      resizeHeroEngine(engine);
      paintHero(engine);
    };

    onResize();
    const ro = new ResizeObserver(onResize);
    if (viewportRef.current) ro.observe(viewportRef.current);

    Promise.all(landingImages.map((img) => loadHeroImage(img.src)))
      .then((imgs) => {
        imagesRef.current = imgs;
        engine.frontImg = imgs[0];
        engine.backImg = imgs[wrapNext(0, count)];
        paintHero(engine);
      })
      .catch(() => undefined);

    return () => {
      ro.disconnect();
      if (engine.raf) cancelAnimationFrame(engine.raf);
      engineRef.current = null;
    };
  }, [count]);

  const lockPeekDirection = useCallback(
    (dx: number, dy: number) => {
      if (lockedPeekRef.current !== null) return;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < HERO_DIR_LOCK_PX && absY < HERO_DIR_LOCK_PX) return;

      const axis: "x" | "y" =
        absX >= HERO_DIR_LOCK_PX && absY >= HERO_DIR_LOCK_PX
          ? absX > absY
            ? "x"
            : "y"
          : absX >= HERO_DIR_LOCK_PX
            ? "x"
            : "y";

      const target =
        axis === "x"
          ? dx > 0
            ? wrapNext(indexRef.current, count)
            : wrapPrev(indexRef.current, count)
          : dy < 0
            ? wrapNext(indexRef.current, count)
            : wrapPrev(indexRef.current, count);

      lockedPeekRef.current = target;
      setEngineImages(indexRef.current, target);
    },
    [count, setEngineImages]
  );

  const runRipple = useCallback(
    (targetIndex: number) => {
      const engine = engineRef.current;
      if (!engine || ripplingRef.current) return;

      ripplingRef.current = true;
      engine.backImg = imagesRef.current[targetIndex] ?? engine.backImg;

      const seeds = collectRippleSeeds(engine);
      startHeroRipple(engine, seeds, () => {
        resetHeroFlips(engine);
        setIndex(targetIndex);
        indexRef.current = targetIndex;
        lockedPeekRef.current = null;
        engine.frontImg = imagesRef.current[targetIndex] ?? engine.frontImg;
        engine.backImg =
          imagesRef.current[wrapNext(targetIndex, count)] ?? engine.backImg;
        paintHero(engine);
        ripplingRef.current = false;
        draggingRef.current = false;
        setDragging(false);
        dragXRef.current = 0;
        dragYRef.current = 0;
        lastPtRef.current = null;
      });
    },
    [count]
  );

  const brushAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = viewportRef.current;
      const engine = engineRef.current;
      if (!el || !engine) return;

      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (lastPtRef.current) {
        markHeroStroke(
          engine,
          lastPtRef.current.x,
          lastPtRef.current.y,
          x,
          y
        );
      } else {
        const idx = hitTestTriangle(engine, x, y);
        if (idx >= 0) markHeroTile(engine, idx);
      }

      lastPtRef.current = { x, y };
    },
    []
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (ripplingRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;

    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dragXRef.current = 0;
    dragYRef.current = 0;
    lockedPeekRef.current = null;
    lastPtRef.current = null;
    resetHeroFlips(engine);
    engine.backImg =
      imagesRef.current[wrapNext(indexRef.current, count)] ?? engine.backImg;
    paintHero(engine);
    e.currentTarget.setPointerCapture(e.pointerId);
    brushAt(e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || ripplingRef.current) return;
    dragXRef.current = e.clientX - startXRef.current;
    dragYRef.current = e.clientY - startYRef.current;
    lockPeekDirection(dragXRef.current, dragYRef.current);
    brushAt(e.clientX, e.clientY);
  };

  const onPointerUp = () => {
    if (!draggingRef.current || ripplingRef.current) return;
    draggingRef.current = false;
    lastPtRef.current = null;

    const dx = dragXRef.current;
    const dy = dragYRef.current;
    const peek = lockedPeekRef.current;
    const cur = indexRef.current;
    const engine = engineRef.current;
    const dragDistance = Math.hypot(dx, dy);

    if (peek !== null && dragDistance >= HERO_SWIPE_THRESHOLD) {
      runRipple(peek);
      return;
    }

    if (engine) {
      resetHeroFlips(engine);
      setEngineImages(cur, wrapNext(cur, count));
    }
    lockedPeekRef.current = null;
    setDragging(false);
    dragXRef.current = 0;
    dragYRef.current = 0;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ripplingRef.current) return;
      if (e.key === "ArrowRight") runRipple(wrapNext(indexRef.current, count));
      if (e.key === "ArrowLeft") runRipple(wrapPrev(indexRef.current, count));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, runRipple]);

  return (
    <section className="landing-hero">
      <div
        ref={viewportRef}
        className={`landing-hero__viewport${dragging ? " landing-hero__viewport--dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas ref={canvasRef} className="landing-tri-canvas" aria-hidden />
        <div className="landing-hero__scrim" />

        <div className="landing-hero__content">
          <h1 className="landing-hero__title">
            <span className="landing-word landing-word--in-left">Find</span>{" "}
            <span className="landing-word landing-word--in-right">your</span>{" "}
            <span className="landing-word landing-word--in-up">people.</span>
          </h1>
          <p className="landing-hero__subtitle">
            Chat, build private circles, and grow communities that keep people
            coming back.
          </p>
          <div className="landing-hero__actions">
            <Link to="/register" className="landing-btn landing-btn--primary">
              Create your account
              <ArrowRight size={18} className="ml-2" />
            </Link>
            <button
              type="button"
              onClick={onLoginClick}
              className="landing-btn landing-btn--ghost"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage({
  onLoginClick,
}: {
  onLoginClick: () => void;
}) {
  return (
    <main className="relative flex-1 overflow-hidden">
      <TriangleHero onLoginClick={onLoginClick} />

      <section className="relative border-y border-white/10 bg-white/[0.03] py-5">
        <div className="landing-marquee landing-marquee--ltr">
          <span>
            real conversations · close circles · living communities · profiles
            with personality · real conversations · close circles · living
            communities · profiles with personality ·{" "}
          </span>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-20 sm:px-6 lg:grid-cols-4 lg:px-8">
        {featureCards.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className="landing-rise rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
              <Icon size={22} />
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-white/[0.04] p-8 text-center shadow-[0_30px_120px_rgba(79,70,229,0.25)] sm:p-12">
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="relative mx-auto max-w-3xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <HeartHandshake size={26} className="text-indigo-100" />
            </div>
            <h2 className="text-4xl font-black text-white sm:text-6xl">
              Your people are one click away.
            </h2>
            <p className="mt-5 text-lg leading-8 text-indigo-100/75">
              Set up your profile, add a few friends, start a circle, and send the
              first message while the spark is still there.
            </p>
            <div className="mt-8">
              <Link to="/register" className="landing-btn landing-btn--primary mx-auto">
                Join SebetPage
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
