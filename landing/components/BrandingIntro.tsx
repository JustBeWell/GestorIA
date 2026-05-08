'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const EXIT_DURATION_MS = 900;
const INTRO_VOLUME = 0.2;

export default function BrandingIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isExitingRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const startExit = useCallback(() => {
    if (isExitingRef.current) return;

    isExitingRef.current = true;
    setIsExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, EXIT_DURATION_MS);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = INTRO_VOLUME;
    video.muted = false;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(startExit);
      });
    }

    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [startExit]);

  if (!isVisible) return null;

  return (
    <div className={`branding-intro${isExiting ? ' branding-intro--exit' : ''}`} aria-hidden="true">
      <video
        ref={videoRef}
        className="branding-intro__video"
        src="/branding.mp4"
        playsInline
        preload="auto"
        onEnded={startExit}
        onError={startExit}
      />
    </div>
  );
}
