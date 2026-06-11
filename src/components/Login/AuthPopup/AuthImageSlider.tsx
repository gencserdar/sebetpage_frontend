import { AUTH_SLIDE_IMAGES } from "./constants";

interface AuthImageSliderProps {
  sliderRef: React.RefObject<HTMLDivElement | null>;
  currentIndex: number;
  dragOffset: number;
  isDragging: boolean;
  getPrevIndex: () => number;
  getNextIndex: () => number;
  onGoToSlide: (index: number) => void;
  onStart: (clientX: number, clientY: number) => void;
  onMove: (clientX: number, clientY: number) => void;
  onEnd: () => void;
}

export default function AuthImageSlider({
  sliderRef,
  currentIndex,
  dragOffset,
  isDragging,
  getPrevIndex,
  getNextIndex,
  onGoToSlide,
  onStart,
  onMove,
  onEnd,
}: AuthImageSliderProps) {
  const getImageStyle = (imageIndex: number, position: "prev" | "current" | "next") => {
    const baseStyle = {
      position: "absolute" as const,
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      userSelect: "none" as const,
      pointerEvents: "none" as const,
    };

    const sliderWidth = sliderRef.current?.offsetWidth || 300;
    const dragProgress = dragOffset / sliderWidth;

    let transform = "";
    let opacity = 1;
    let zIndex = 1;
    let brightness = 1;

    const calculateBrightnessFromVisibility = (visibleRatio: number): number => {
      const minBrightness = 0.4;
      const maxBrightness = 1.0;
      return minBrightness + (maxBrightness - minBrightness) * Math.max(0, Math.min(1, visibleRatio));
    };

    switch (position) {
      case "current":
        transform = `translateX(${dragOffset}px)`;
        brightness = calculateBrightnessFromVisibility(Math.max(0, 1 - Math.abs(dragProgress)));
        zIndex = 2;
        break;
      case "prev":
        if (dragOffset > 0) {
          transform = `translateX(${dragOffset - sliderWidth}px)`;
          brightness = calculateBrightnessFromVisibility(Math.max(0, Math.min(1, dragProgress)));
          opacity = 1;
          zIndex = 1;
        } else {
          transform = `translateX(-${sliderWidth}px)`;
          opacity = 0;
          brightness = calculateBrightnessFromVisibility(0);
          zIndex = 1;
        }
        break;
      case "next":
        if (dragOffset < 0) {
          transform = `translateX(${dragOffset + sliderWidth}px)`;
          brightness = calculateBrightnessFromVisibility(Math.max(0, Math.min(1, Math.abs(dragProgress))));
          opacity = 1;
          zIndex = 1;
        } else {
          transform = `translateX(${sliderWidth}px)`;
          opacity = 0;
          brightness = calculateBrightnessFromVisibility(0);
          zIndex = 1;
        }
        break;
    }

    return {
      ...baseStyle,
      transform,
      opacity,
      zIndex,
      filter: `brightness(${brightness})`,
      transition: "none",
    };
  };

  return (
    <div
      ref={sliderRef}
      className="relative md:w-1/2 h-56 md:h-auto overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => {
        e.preventDefault();
        onStart(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseUp={onEnd}
      onMouseLeave={() => {
        if (isDragging) onEnd();
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        onStart(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        const touch = e.touches[0];
        onMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={onEnd}
      style={{ touchAction: "pan-y" }}
    >
      <img
        src={AUTH_SLIDE_IMAGES[getPrevIndex()].url}
        alt=""
        style={getImageStyle(getPrevIndex(), "prev")}
      />
      <img
        src={AUTH_SLIDE_IMAGES[currentIndex].url}
        alt=""
        style={getImageStyle(currentIndex, "current")}
      />
      <img
        src={AUTH_SLIDE_IMAGES[getNextIndex()].url}
        alt=""
        style={getImageStyle(getNextIndex(), "next")}
      />

      <div className="absolute inset-0 bg-black/40 z-10" />

      <div className="relative z-20 flex h-full flex-col justify-between p-6">
        <div className="text-2xl font-bold">SEBETPAGE</div>
        <div className="mb-6">
          <h3 className="text-lg leading-snug">{AUTH_SLIDE_IMAGES[currentIndex].caption}</h3>
          <div className="flex space-x-2 mt-4">
            {AUTH_SLIDE_IMAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onGoToSlide(idx)}
                className={`w-4 h-0.5 rounded-sm transition-colors duration-200 ${
                  idx === currentIndex ? "bg-white" : "bg-gray-600 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
