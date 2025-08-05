import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "../context/UserContext";

interface Props {
  initialMode: "login" | "forgot";
  onSubmit: () => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 80; // Minimum sürükleme mesafesi
const SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum hız (px/ms)
const ANIMATION_DURATION = 400; // Increased for smoother animation
const AUTO_SLIDE_INTERVAL = 4000; // ms

const images = [
  { url: "/img1.png", caption: "Welcome to SebetPage!" },
  { url: "/img2.jpg", caption: "Capture your favorite memories" },
  { url: "/img3.jpg", caption: "Share moments with your friends" }
];

export default function AuthPopup({ initialMode, onSubmit, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState(initialMode);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const { login, forgotPassword } = useUser();
  
  // Slider state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  

  useEffect(() => {
    setError(null); // mod değiştiğinde hatayı temizle
  }, [mode]);

  // Improved easing function - smoother ease-in-out
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Alternative smoother easing
  const easeOutQuart = (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  };

  // Auto slide fonksiyonu
  const scheduleAutoSlide = useCallback(() => {
    if (autoSlideRef.current) {
      clearTimeout(autoSlideRef.current);
    }
    
    if (!isDragging && !isTransitioning) {
      autoSlideRef.current = setTimeout(() => {
        goToSlide((currentIndex + 1) % images.length);
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [currentIndex, isDragging, isTransitioning]);

  // Slide geçiş fonksiyonu - FIXED ANIMATION
  const goToSlide = useCallback((targetIndex: number, immediate = false) => {
    if (isTransitioning || targetIndex === currentIndex) return;
    
    setIsTransitioning(true);
    
    if (immediate) {
      setCurrentIndex(targetIndex);
      setDragOffset(0);
      setIsTransitioning(false);
      return;
    }

    // Yön belirleme - sağdan başa dönerken sağa animasyon
    let direction: 'left' | 'right';
    if (currentIndex === images.length - 1 && targetIndex === 0) {
      direction = 'right'; // Sağdan başa dönerken sağa git
    } else if (currentIndex === 0 && targetIndex === images.length - 1) {
      direction = 'left'; // Baştan sona dönerken sola git
    } else {
      direction = targetIndex > currentIndex ? 'right' : 'left';
    }

    // Animasyon ile geçiş - IMPROVED
    const startTime = Date.now();
    const startOffset = dragOffset;
    const sliderWidth = sliderRef.current?.offsetWidth || 300;
    const targetOffset = direction === 'right' ? -sliderWidth : sliderWidth;
    const totalDistance = targetOffset - startOffset;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Use smoother easing function
      const easedProgress = easeInOutCubic(progress);
      
      // Calculate new offset
      const newOffset = startOffset + (totalDistance * easedProgress);
      setDragOffset(newOffset);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure exact final position
        setCurrentIndex(targetIndex);
        setDragOffset(0);
        setIsTransitioning(false);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [currentIndex, dragOffset, isTransitioning]);

  // Touch/Mouse event handlers
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (isTransitioning) return;
    
    setTouchStart({ x: clientX, y: clientY, time: Date.now() });
    setIsDragging(true);
    
    // Auto slide'ı durdur
    if (autoSlideRef.current) {
      clearTimeout(autoSlideRef.current);
    }
    
    // Devam eden animasyonu durdur
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isTransitioning]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !touchStart || isTransitioning) return;
    
    const deltaX = clientX - touchStart.x;
    const deltaY = clientY - touchStart.y;
    
    // Dikey kaydırma varsa yatay kaydırmayı iptal et
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      return;
    }
    
    // Sınırları kontrol et - add some resistance at edges
    const maxOffset = sliderRef.current?.offsetWidth || 300;
    let clampedOffset = deltaX;
    
    // Add resistance at edges for more natural feel
    if (Math.abs(deltaX) > maxOffset * 0.8) {
      const excess = Math.abs(deltaX) - maxOffset * 0.8;
      const resistance = 0.3; // Resistance factor
      clampedOffset = deltaX > 0 
        ? maxOffset * 0.8 + excess * resistance
        : -maxOffset * 0.8 - excess * resistance;
    }
    
    setDragOffset(clampedOffset);
  }, [isDragging, touchStart, isTransitioning]);

  const handleEnd = useCallback(() => {
    if (!isDragging || !touchStart) return;
    
    const deltaX = dragOffset;
    const deltaTime = Date.now() - touchStart.time;
    const velocity = Math.abs(deltaX) / deltaTime; // px/ms
    
    setIsDragging(false);
    setTouchStart(null);
    
    // Karar verme algoritması
    let shouldSwipe = false;
    let direction = 0;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD) {
      shouldSwipe = true;
      direction = deltaX > 0 ? -1 : 1; // Pozitif deltaX = sola swipe = önceki resim
    }
    
    if (shouldSwipe) {
      const targetIndex = direction > 0 
        ? (currentIndex + 1) % images.length
        : (currentIndex - 1 + images.length) % images.length;
      goToSlide(targetIndex);
    } else {
      // Geri döndür - SMOOTHER SNAP BACK
      setIsTransitioning(true);
      const startTime = Date.now();
      const startOffset = dragOffset;
      const snapDuration = Math.min(ANIMATION_DURATION / 2, 200); // Shorter snap back
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / snapDuration, 1);
        const easedProgress = easeOutQuart(progress);
        
        setDragOffset(startOffset * (1 - easedProgress));
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDragOffset(0);
          setIsTransitioning(false);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isDragging, touchStart, dragOffset, currentIndex, goToSlide]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Scroll'u engelle
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Auto slide effect
  useEffect(() => {
    scheduleAutoSlide();
    return () => {
      if (autoSlideRef.current) {
        clearTimeout(autoSlideRef.current);
      }
    };
  }, [scheduleAutoSlide]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Helper functions
  const getPrevIndex = () => (currentIndex - 1 + images.length) % images.length;
  const getNextIndex = () => (currentIndex + 1) % images.length;

  const getImageStyle = (imageIndex: number, position: 'prev' | 'current' | 'next') => {
    const baseStyle = {
      position: 'absolute' as const,
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      userSelect: 'none' as const,
      pointerEvents: 'none' as const,
    };

    const sliderWidth = sliderRef.current?.offsetWidth || 300;
    const dragProgress = dragOffset / sliderWidth;
    
    let transform = '';
    let opacity = 1;
    let zIndex = 1;
    let brightness = 1;

    // Helper function to calculate brightness based on visible area
    const calculateBrightnessFromVisibility = (visibleRatio: number): number => {
      // Min brightness: 0.4, Max brightness: 1.0
      // Brightness scales linearly with visible area
      const minBrightness = 0.4;
      const maxBrightness = 1.0;
      return minBrightness + (maxBrightness - minBrightness) * Math.max(0, Math.min(1, visibleRatio));
    };

    switch (position) {
      case 'current':
        transform = `translateX(${dragOffset}px)`;
        
        // Calculate visible ratio for current image
        const currentVisibleRatio = Math.max(0, 1 - Math.abs(dragProgress));
        brightness = calculateBrightnessFromVisibility(currentVisibleRatio);
        zIndex = 2;
        break;
        
      case 'prev':
        // Sol taraftan gelir (pozitif drag offset ile)
        if (dragOffset > 0) {
          transform = `translateX(${dragOffset - sliderWidth}px)`;
          
          // Calculate visible ratio for previous image coming from left
          const prevVisibleRatio = Math.max(0, Math.min(1, dragProgress));
          brightness = calculateBrightnessFromVisibility(prevVisibleRatio);
          opacity = 1;
          zIndex = 1;
        } else {
          // Görünmez konumda
          transform = `translateX(-${sliderWidth}px)`;
          opacity = 0;
          brightness = calculateBrightnessFromVisibility(0);
          zIndex = 1;
        }
        break;
        
      case 'next':
        // Sağ taraftan gelir (negatif drag offset ile)
        if (dragOffset < 0) {
          transform = `translateX(${dragOffset + sliderWidth}px)`;
          
          // Calculate visible ratio for next image coming from right
          const nextVisibleRatio = Math.max(0, Math.min(1, Math.abs(dragProgress)));
          brightness = calculateBrightnessFromVisibility(nextVisibleRatio);
          opacity = 1;
          zIndex = 1;
        } else {
          // Görünmez konumda
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
      // Remove CSS transition when dragging or animating manually
      transition: 'none',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let success = false;

      if (mode === "login") {
        success = await login(email, password, rememberMe);
      } else if (mode === "forgot") {
        success = await forgotPassword(email);
        if (success) {
          setShowResetPopup(true);
          return;
        }
      }
      if (success) {
        onSubmit();
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    }
  };

  const title = mode === "login" ? "Log in to your account" : "Reset your password";

  return (
    <div className="relative flex flex-col md:flex-row text-white rounded-2xl overflow-hidden w-full max-w-4xl bg-white/10 backdrop-blur-xl backdrop-saturate-200 bg-gradient-to-br from-white/20 via-white/5 to-white/10 border border-white/20 shadow-lg shadow-black/40">
      {/* Sol Panel – Slider */}
      <div
        ref={sliderRef}
        className="relative md:w-1/2 h-56 md:h-auto overflow-hidden select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }} // Sadece dikey scroll'a izin ver
      >
        {/* Önceki resim */}
        <img
          src={images[getPrevIndex()].url}
          alt=""
          style={getImageStyle(getPrevIndex(), 'prev')}
        />

        {/* Mevcut resim */}
        <img
          src={images[currentIndex].url}
          alt=""
          style={getImageStyle(currentIndex, 'current')}
        />

        {/* Sonraki resim */}
        <img
          src={images[getNextIndex()].url}
          alt=""
          style={getImageStyle(getNextIndex(), 'next')}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* Slider içerik */}
        <div className="relative z-20 flex h-full flex-col justify-between p-6">
          <div className="text-2xl font-bold">SEBETPAGE</div>
          <div className="mb-6">
            <h3 className="text-lg leading-snug">{images[currentIndex].caption}</h3>
            <div className="flex space-x-2 mt-4">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`w-4 h-0.5 rounded-sm transition-colors duration-200 ${
                    idx === currentIndex ? "bg-white" : "bg-gray-600 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="md:w-1/2 p-12 relative">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        
        {mode === "login" && (
          <>
            <p className="text-sm text-gray-400 mb-6">
              Don't have an account?{" "}
              <a href="/register" className="underline">
                Sign up
              </a>
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-[#322f45] py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-[#322f45] py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="h-4">
                {error && (
                  <span className="block text-red-400 text-sm opacity-0 translate-y-[-3px] animate-[fadeInMove_0.6s_ease-out_forwards]">
                    {error}
                  </span>
                )}
              </div>

              <label
                className={`flex items-center text-sm transition-all duration-300 ${
                  error ? "mt-2" : "mt-0"
                }`}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 accent-indigo-500"
                />
                <span>Remember me</span>
              </label>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 transition font-medium"
              >
                Log in
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow h-px bg-gray-700"></div>
                <span className="px-3 text-sm text-gray-400">or</span>
                <div className="flex-grow h-px bg-gray-700"></div>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-white text-black hover:bg-gray-100 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-5 h-5"
                >
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.1-2.5-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.3 16.1 18.8 13 24 13c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 15.1 3 7.4 8.5 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 45c5.3 0 10-1.7 13.7-4.6l-6.3-5.2C29.8 36.5 27 37.5 24 37.5c-5.3 0-9.7-3.4-11.3-8l-6.6 5C7.4 39.5 15.1 45 24 45z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5h-1.9V20H24v8h11.3c-.7 2-2.1 3.8-3.8 5.1l6.3 5.2C40.4 35.8 43.6 30.4 43.6 24c0-1.3-.1-2.5-.4-3.5z"
                  />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-black text-white hover:bg-gray-900 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 1024 1024"
                  className="w-5 h-5"
                >
                  <path d="M747 519c-1-77 33-136 101-179-38-55-96-85-173-90-73-5-153 42-182 42-31 0-102-40-157-40-115 2-239 90-239 268 0 106 39 219 87 291 41 62 95 132 162 129 64-3 88-42 165-42 77 0 98 42 165 41 68-1 111-63 152-125 48-71 68-140 69-143-2-1-132-51-134-252zM643 161c54-65 49-124 48-145-48 3-104 33-137 71-35 39-57 88-52 147 53 4 105-27 141-73z" />
                </svg>
                Continue with Apple
              </button>
            </form>
          </>
        )}

        {mode === "forgot" && (
          <>
            <p className="text-sm text-gray-400 mb-6">
              Enter your email address and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-[#322f45] py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="h-4">
                {error && (
                  <span className="block text-red-400 text-sm opacity-0 translate-y-[-3px] animate-[fadeInMove_0.6s_ease-out_forwards]">
                    {error}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 transition font-medium"
              >
                Send Reset Link
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition duration-300"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {showResetPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl backdrop-saturate-200 bg-gradient-to-br from-white/10 to-white/5 text-white rounded-2xl p-6 shadow-lg max-w-sm w-full text-center">
              <p className="mb-4 text-lg">A reset link has been sent to your email.</p>
              <button
                onClick={() => {
                  setShowResetPopup(false);
                  setMode("login");
                }}
                className="px-4 py-2 bg-[#635bff] text-white rounded-lg hover:bg-[#5146ff] transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    
  );
}