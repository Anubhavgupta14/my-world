import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./icons";
import { useUniverse } from "./universe-context";

export function ChapterHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  const { index } = useUniverse();
  return (
    <header className="chapter-header">
      <p className="kicker">
        <span className="kicker-line" aria-hidden />
        Chapter {String(index + 1).padStart(2, "0")}
        <span className="kicker-line" aria-hidden />
      </p>
      <h1 className="chapter-title" tabIndex={-1} data-scene-heading>
        {title}
      </h1>
      {subtitle && <p className="chapter-sub">{subtitle}</p>}
    </header>
  );
}

interface ChapterNavProps {
  nextLabel: ReactNode;
  onNext?: () => void;
  /** The next button stays hidden until the chapter's moment is complete, then fades in. */
  ready?: boolean;
  children?: ReactNode;
}

export function ChapterNav({ nextLabel, onNext, ready = true, children }: ChapterNavProps) {
  const { next, back, index } = useUniverse();
  return (
    <nav className="chapter-nav" aria-label="Chapter navigation">
      {index > 0 && (
        <button type="button" className="btn btn-ghost btn-icon" onClick={back} aria-label="Previous chapter">
          <ArrowLeftIcon />
        </button>
      )}
      {children}
      {ready && (
        <button
          type="button"
          className="btn chapter-next btn-primary btn-glow"
          onClick={onNext ?? next}
        >
          {nextLabel}
        </button>
      )}
    </nav>
  );
}
