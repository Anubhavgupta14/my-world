import type { Stretch } from "@/lib/stretches";

/* All illustrations are hand-written SVG: nothing to download, nothing awkward. */

/** A knitted hot water bag that warms up (0 → 1) and gets happier as it does. */
export function HotWaterBag({ warmth, size = 200 }: { warmth: number; size?: number }) {
  const w = Math.max(0, Math.min(1, warmth));
  const fillTop = 192 - w * 138;
  const happy = w > 0.55;
  return (
    <svg viewBox="0 0 160 200" width={size} height={size * 1.25} aria-hidden>
      <defs>
        <clipPath id="hwb-body">
          <rect x="18" y="52" width="124" height="138" rx="40" />
        </clipPath>
        <linearGradient id="hwb-heat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff5e3a" />
          <stop offset="60%" stopColor="#ff9a4d" />
          <stop offset="100%" stopColor="#ffc773" />
        </linearGradient>
        <pattern id="hwb-knit" width="12" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 5 Q3 0 6 5 T12 5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.6" />
        </pattern>
      </defs>
      {/* cap + neck */}
      <rect x="56" y="8" width="48" height="18" rx="6" fill="#7a4fd6" />
      <rect x="62" y="22" width="36" height="36" rx="8" fill="#f2b8c9" />
      {/* body */}
      <rect x="18" y="52" width="124" height="138" rx="40" fill="#ffc9d6" />
      <g clipPath="url(#hwb-body)">
        <rect x="0" y={fillTop} width="160" height="200" fill="url(#hwb-heat)" opacity={0.55 + w * 0.4} />
        <rect x="0" y="0" width="160" height="200" fill="url(#hwb-knit)" />
      </g>
      <rect x="18" y="52" width="124" height="138" rx="40" fill="none" stroke="#2e1a2b" strokeOpacity="0.12" strokeWidth="3" />
      {/* face */}
      {happy ? (
        <>
          <path d="M55 112 q7 -8 14 0" stroke="#2e1a2b" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M91 112 q7 -8 14 0" stroke="#2e1a2b" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="62" cy="110" r="5" fill="#2e1a2b" />
          <circle cx="98" cy="110" r="5" fill="#2e1a2b" />
        </>
      )}
      <ellipse cx="48" cy="126" rx="9" ry="5" fill="#ff6f91" opacity={0.25 + w * 0.6} />
      <ellipse cx="112" cy="126" rx="9" ry="5" fill="#ff6f91" opacity={0.25 + w * 0.6} />
      <path
        d={happy ? "M70 126 q10 12 20 0" : "M72 128 q8 4 16 0"}
        stroke="#2e1a2b"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* little heart patch */}
      <path
        d="M80 168s-10-6-12-12c-1.6-4.4 1.4-8 5-8 2.6 0 4.6 1.4 7 4 2.4-2.6 4.4-4 7-4 3.6 0 6.6 3.6 5 8-2 6-12 12-12 12Z"
        fill="#e5487a"
        opacity="0.85"
      />
    </svg>
  );
}

/** A gift box whose lid (.gift-lid) is a separate group so GSAP can fling it off. */
export function GiftBox({ size = 180 }: { size?: number }) {
  return (
    <svg viewBox="0 0 180 170" width={size} height={size * 0.94} aria-hidden overflow="visible">
      <rect x="22" y="70" width="136" height="92" rx="14" fill="#6e3f2a" />
      <rect x="22" y="70" width="136" height="20" fill="#5a3121" />
      <rect x="80" y="70" width="20" height="92" fill="#e5487a" />
      <circle cx="50" cy="120" r="5" fill="#ffd6a5" opacity="0.5" />
      <circle cx="130" cy="135" r="4" fill="#ffd6a5" opacity="0.5" />
      <circle cx="122" cy="105" r="3" fill="#ffd6a5" opacity="0.5" />
      <g className="gift-lid" style={{ transformOrigin: "90px 66px", transformBox: "view-box" }}>
        <rect x="14" y="48" width="152" height="30" rx="10" fill="#8a5238" />
        <rect x="80" y="48" width="20" height="30" fill="#ff6f91" />
        <path d="M90 48c-14-26-44-22-36-6 5 9 24 8 36 6Z" fill="#ff6f91" />
        <path d="M90 48c14-26 44-22 36-6-5 9-24 8-36 6Z" fill="#e5487a" />
        <circle cx="90" cy="46" r="8" fill="#c9356a" />
      </g>
    </svg>
  );
}

/** Her favourite. A rasgulla in a little bowl of syrup. */
export function Rasgulla({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <ellipse cx="24" cy="34" rx="19" ry="8" fill="#f6d79b" />
      <path d="M5 33c1 9 9 12 19 12s18-3 19-12" fill="#e9c27a" />
      <circle cx="18" cy="26" r="9" fill="#fffaf0" stroke="#f0dfc0" strokeWidth="1.5" />
      <circle cx="30" cy="27" r="8" fill="#fffdf6" stroke="#f0dfc0" strokeWidth="1.5" />
      <circle cx="15" cy="23" r="2" fill="white" />
      <circle cx="27.5" cy="24" r="1.6" fill="white" />
    </svg>
  );
}

/** The villain of the mini game: a small, grumpy, entirely squishable cramp. */
export function CrampBlob({ squished = false, golden = false }: { squished?: boolean; golden?: boolean }) {
  const fill = golden ? "#ffc23d" : "#9b7bea";
  const shade = golden ? "#f29d00" : "#7a58d6";
  return (
    <svg viewBox="0 0 80 70" className="h-full w-full" aria-hidden>
      {squished ? (
        <>
          <ellipse cx="40" cy="56" rx="32" ry="10" fill={fill} />
          <path d="M26 54l6 4M32 54l-6 4M48 54l6 4M54 54l-6 4" stroke="#2e1a2b" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path
            d="M10 60c-4-20 4-44 30-44s34 24 30 44c-2 6-56 6-60 0Z"
            fill={fill}
          />
          <path d="M10 60c4 4 56 4 60 0-1 5-59 5-60 0Z" fill={shade} />
          {/* angry brows */}
          <path d="M22 30l12 5M58 30l-12 5" stroke="#2e1a2b" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="30" cy="40" r="4" fill="#2e1a2b" />
          <circle cx="50" cy="40" r="4" fill="#2e1a2b" />
          <path d="M33 52q7-6 14 0" stroke="#2e1a2b" strokeWidth="3" fill="none" strokeLinecap="round" />
          {golden && <path d="M30 14l4-8 6 6 6-6 4 8Z" fill="#ff8a00" />}
        </>
      )}
    </svg>
  );
}

/** Tiny line-drawing of each stretch. */
export function Pose({ pose, className }: { pose: Stretch["pose"]; className?: string }) {
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const head = (cx: number, cy: number) => <circle cx={cx} cy={cy} r="7" fill="currentColor" />;
  const shapes: Record<Stretch["pose"], React.ReactNode> = {
    child: (
      <>
        <path {...s} d="M84 44 Q62 34 40 50" />
        <path {...s} d="M42 50 L14 60" />
        <path {...s} d="M84 44 L66 62 L96 62" />
        {head(32, 56)}
      </>
    ),
    catcow: (
      <>
        <path {...s} d="M38 38 Q62 18 86 38" />
        <path {...s} d="M38 38 L38 62 M86 38 L86 62 L102 62" />
        {head(26, 44)}
      </>
    ),
    knees: (
      <>
        <path {...s} d="M24 60 L64 60" />
        <path {...s} d="M64 60 L56 34 L74 30" />
        <path {...s} d="M34 58 L54 38" />
        {head(16, 56)}
      </>
    ),
    twist: (
      <>
        <path {...s} d="M24 60 L66 60" />
        <path {...s} d="M66 60 L90 50 L92 64" />
        <path {...s} d="M34 60 L34 40 M34 60 L34 66" />
        {head(16, 56)}
      </>
    ),
    butterfly: (
      <>
        <path {...s} d="M24 60 L64 60" />
        <path {...s} d="M64 60 L80 40 L96 60" />
        <path {...s} d="M64 60 L84 48 L96 60" opacity="0.5" />
        {head(16, 56)}
      </>
    ),
    tilt: (
      <>
        <path {...s} d="M24 60 Q44 54 64 60" />
        <path {...s} d="M64 60 L82 38 L98 62" />
        <path d="M44 44 l-4 -6 m4 6 l5 -5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        {head(16, 56)}
      </>
    ),
  };
  return (
    <svg viewBox="0 0 112 72" className={className} aria-hidden>
      <path d="M6 68 H106" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" strokeLinecap="round" />
      {shapes[pose]}
    </svg>
  );
}
