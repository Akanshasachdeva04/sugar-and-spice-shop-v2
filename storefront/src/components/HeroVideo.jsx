import { useEffect, useRef } from "react";

/**
 * Silent, looping hero video that is safe on phones:
 * - muted + playsInline (required for autoplay on iPhone/Android)
 * - pauses when scrolled out of view (saves battery and data)
 * - stays a still picture if the visitor prefers reduced motion or has Data Saver on
 */
export default function HeroVideo({ src, poster, label = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    v.muted = true; // React does not always set the muted attribute, iOS needs it
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) {
      v.pause();
      return undefined;
    }
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (!("IntersectionObserver" in window)) { play(); return undefined; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) play(); else v.pause(); },
      { threshold: 0.15 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className="hero-video"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
      disablePictureInPicture
    />
  );
}
