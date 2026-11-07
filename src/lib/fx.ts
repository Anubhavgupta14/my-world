import gsap from "gsap";

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A tiny buzz on phones that support it. */
export function buzz(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/**
 * Throw a handful of emoji out from a point (or the centre of an element).
 * Used for hearts, sparkles and chocolate confetti.
 */
export function burst(
  from: HTMLElement | { x: number; y: number },
  emojis: string[] = ["💗", "✨", "💖", "🌸"],
  count = 14,
) {
  // Confetti is decoration: never let a missing element break the real action.
  if (typeof document === "undefined" || !from || reducedMotion()) return;
  let x: number;
  let y: number;
  if (from instanceof HTMLElement) {
    const r = from.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else {
    ({ x, y } = from);
  }
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "fx-particle";
    el.textContent = emojis[i % emojis.length];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 110;
    gsap
      .timeline({ onComplete: () => el.remove() })
      .fromTo(
        el,
        { xPercent: -50, yPercent: -50, scale: 0.3, opacity: 1, rotate: 0 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 40,
          scale: 0.8 + Math.random() * 0.8,
          rotate: (Math.random() - 0.5) * 120,
          duration: 0.7 + Math.random() * 0.4,
          ease: "power3.out",
        },
      )
      .to(el, { y: "+=70", opacity: 0, duration: 0.6, ease: "power1.in" }, "-=0.15");
  }
}
