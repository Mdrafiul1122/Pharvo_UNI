import { useEffect, useState } from "react";

/* Animated number counter for hero stats. Respects
 * prefers-reduced-motion (jumps straight to the value).
 * Pure display effect — the underlying figures are unchanged. */
export function useCountUp(target, durationMs = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(end);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return display;
}

export function formatCountMoney(value, animated) {
  const num = Number(value ?? 0);
  const shown = animated === undefined ? num : animated;
  if (Number.isNaN(shown)) return "৳0";
  return `৳${shown.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
