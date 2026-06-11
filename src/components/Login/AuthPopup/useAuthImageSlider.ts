import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANIMATION_DURATION,
  AUTH_SLIDE_IMAGES,
  AUTO_SLIDE_INTERVAL,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD,
} from "./constants";

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export function useAuthImageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  const goToSlide = useCallback(
    (targetIndex: number, immediate = false) => {
      if (isTransitioning || targetIndex === currentIndex) return;

      setIsTransitioning(true);

      if (immediate) {
        setCurrentIndex(targetIndex);
        setDragOffset(0);
        setIsTransitioning(false);
        return;
      }

      let direction: "left" | "right";
      if (currentIndex === AUTH_SLIDE_IMAGES.length - 1 && targetIndex === 0) {
        direction = "right";
      } else if (currentIndex === 0 && targetIndex === AUTH_SLIDE_IMAGES.length - 1) {
        direction = "left";
      } else {
        direction = targetIndex > currentIndex ? "right" : "left";
      }

      const startTime = Date.now();
      const startOffset = dragOffset;
      const sliderWidth = sliderRef.current?.offsetWidth || 300;
      const targetOffset = direction === "right" ? -sliderWidth : sliderWidth;
      const totalDistance = targetOffset - startOffset;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        const easedProgress = easeInOutCubic(progress);
        const newOffset = startOffset + totalDistance * easedProgress;
        setDragOffset(newOffset);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentIndex(targetIndex);
          setDragOffset(0);
          setIsTransitioning(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [currentIndex, dragOffset, isTransitioning]
  );

  const scheduleAutoSlide = useCallback(() => {
    if (autoSlideRef.current) {
      clearTimeout(autoSlideRef.current);
    }

    if (!isDragging && !isTransitioning) {
      autoSlideRef.current = setTimeout(() => {
        goToSlide((currentIndex + 1) % AUTH_SLIDE_IMAGES.length);
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [currentIndex, isDragging, isTransitioning, goToSlide]);

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (isTransitioning) return;

      setTouchStart({ x: clientX, y: clientY, time: Date.now() });
      setIsDragging(true);

      if (autoSlideRef.current) {
        clearTimeout(autoSlideRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    },
    [isTransitioning]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !touchStart || isTransitioning) return;

      const deltaX = clientX - touchStart.x;
      const deltaY = clientY - touchStart.y;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        return;
      }

      const maxOffset = sliderRef.current?.offsetWidth || 300;
      let clampedOffset = deltaX;

      if (Math.abs(deltaX) > maxOffset * 0.8) {
        const excess = Math.abs(deltaX) - maxOffset * 0.8;
        const resistance = 0.3;
        clampedOffset =
          deltaX > 0
            ? maxOffset * 0.8 + excess * resistance
            : -maxOffset * 0.8 - excess * resistance;
      }

      setDragOffset(clampedOffset);
    },
    [isDragging, touchStart, isTransitioning]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging || !touchStart) return;

    const deltaX = dragOffset;
    const deltaTime = Date.now() - touchStart.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    setIsDragging(false);
    setTouchStart(null);

    let shouldSwipe = false;
    let direction = 0;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD) {
      shouldSwipe = true;
      direction = deltaX > 0 ? -1 : 1;
    }

    if (shouldSwipe) {
      const targetIndex =
        direction > 0
          ? (currentIndex + 1) % AUTH_SLIDE_IMAGES.length
          : (currentIndex - 1 + AUTH_SLIDE_IMAGES.length) % AUTH_SLIDE_IMAGES.length;
      goToSlide(targetIndex);
    } else {
      setIsTransitioning(true);
      const startTime = Date.now();
      const startOffset = dragOffset;
      const snapDuration = Math.min(ANIMATION_DURATION / 2, 200);

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

  useEffect(() => {
    scheduleAutoSlide();
    return () => {
      if (autoSlideRef.current) {
        clearTimeout(autoSlideRef.current);
      }
    };
  }, [scheduleAutoSlide]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const getPrevIndex = () => (currentIndex - 1 + AUTH_SLIDE_IMAGES.length) % AUTH_SLIDE_IMAGES.length;
  const getNextIndex = () => (currentIndex + 1) % AUTH_SLIDE_IMAGES.length;

  return {
    sliderRef,
    currentIndex,
    dragOffset,
    isDragging,
    goToSlide,
    getPrevIndex,
    getNextIndex,
    handleStart,
    handleMove,
    handleEnd,
  };
}
