import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

gsap.registerPlugin(useGSAP);

/**
 * A mobile bottom sheet. Slides up with GSAP, drag the handle down (or tap the
 * backdrop / press Escape) to close.
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  full = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  full?: boolean;
}) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  useGSAP(
    () => {
      if (!mounted || !panel.current) return;
      if (open) {
        gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(panel.current, { yPercent: 100 }, { yPercent: 0, y: 0, duration: 0.55, ease: "expo.out" });
      } else {
        gsap.to(backdrop.current, { opacity: 0, duration: 0.25 });
        gsap.to(panel.current, {
          yPercent: 100,
          duration: 0.35,
          ease: "power3.in",
          onComplete: () => setMounted(false),
        });
      }
    },
    { dependencies: [open, mounted], scope: root },
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    gsap.set(panel.current, { y: drag.current.dy });
  };
  const onPointerUp = () => {
    if (!drag.current || !panel.current) return;
    if (drag.current.dy > 110) onClose();
    else gsap.to(panel.current, { y: 0, duration: 0.4, ease: "back.out(2)" });
    drag.current = null;
  };

  return createPortal(
    <div ref={root} className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div ref={backdrop} className="absolute inset-0 bg-[#2e1a2b]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        className={`absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[480px] flex-col rounded-t-[34px] bg-bg shadow-[0_-20px_50px_-20px_rgba(60,20,40,0.5)] ${
          full ? "h-[94dvh]" : "max-h-[90dvh]"
        }`}
      >
        <div
          className="flex cursor-grab touch-none justify-center pt-3 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-12 rounded-full bg-ink/15" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-1 pb-3">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="font-display text-2xl leading-tight font-semibold">{title}</h2>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink-soft shadow-sm"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+var(--safe-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
