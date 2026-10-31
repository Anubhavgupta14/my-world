import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const HEART_PATH =
  "M12 20.6s-7.6-4.7-9.9-9.4C.6 8.1 2.3 4.2 6 3.8c2.1-.2 4.1 1 6 3.2 1.9-2.2 3.9-3.4 6-3.2 3.7.4 5.4 4.3 3.9 7.4-2.3 4.7-9.9 9.4-9.9 9.4z";

export const SPARKLE_PATH =
  "M12 0C12.7 7.3 16.7 11.3 24 12 16.7 12.7 12.7 16.7 12 24 11.3 16.7 7.3 12.7 0 12 7.3 11.3 11.3 7.3 12 0Z";

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} stroke="none" fill="currentColor" {...props}>
      <path d={HEART_PATH} />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base} stroke="none" fill="currentColor" {...props}>
      <path d={SPARKLE_PATH} />
    </svg>
  );
}

/** A soft, glossy little rasgulla (her favourite). */
export function RasgullaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable={false} {...props}>
      <ellipse cx="24" cy="42" rx="15" ry="3.5" fill="rgba(235, 190, 110, 0.45)" />
      <circle cx="24" cy="24" r="17" fill="#fbf4e6" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#e9d6b4" strokeWidth="1.2" />
      <path d="M10 30a17 17 0 0 0 28 0" fill="none" stroke="#efdfc2" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="17.5" cy="16" rx="5.5" ry="3.4" fill="#fff" transform="rotate(-32 17.5 16)" />
      <circle cx="29" cy="29" r="1.3" fill="#ead6b2" />
      <circle cx="21" cy="32" r="1" fill="#ead6b2" />
      <circle cx="32" cy="20" r="0.9" fill="#ead6b2" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}

export function MusicIcon({ off, ...props }: IconProps & { off?: boolean }) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function SpeakerIcon({ off, ...props }: IconProps & { off?: boolean }) {
  return (
    <svg {...base} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      {off ? (
        <path d="m16 9 5 5m0-5-5 5" />
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      )}
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ReplayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
