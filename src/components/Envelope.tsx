import { HeartIcon } from "./icons";

interface EnvelopeProps {
  open?: boolean;
  size?: "sm" | "lg";
  wiggle?: boolean;
}

/** A pure-CSS envelope with a wax heart seal. Decorative — wrap it in a button to make it interactive. */
export function Envelope({ open = false, size = "lg", wiggle = false }: EnvelopeProps) {
  return (
    <div className={`envelope env-${size} ${open ? "is-open" : ""} ${wiggle ? "env-wiggle" : ""}`} aria-hidden>
      <div className="env-back" />
      <div className="env-letter">
        <span className="env-letter-title">For Doctor</span>
        <span className="env-line" />
        <span className="env-line" />
        <span className="env-line short" />
        <HeartIcon className="env-letter-heart" />
      </div>
      <div className="env-front" />
      <div className="env-flap" />
      <div className="env-seal">
        <HeartIcon />
      </div>
    </div>
  );
}
