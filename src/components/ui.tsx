import type { ReactNode } from "react";
import { MinusIcon, PlusIcon } from "./icons";

export type ToolId = "chocolate" | "hotbag" | "call" | "stretch" | "game";

export const TOOLS: Record<ToolId, { emoji: string; title: string; sub: string; tint: string }> = {
  chocolate: { emoji: "🍫", title: "Chocolate box", sub: "Unwrap a surprise", tint: "#f6e2d6" },
  hotbag: { emoji: "♨️", title: "Hot water bag", sub: "Hold to warm up", tint: "#ffe2d8" },
  call: { emoji: "📞", title: "Call him", sub: "On call 24/7", tint: "#ffdbe6" },
  stretch: { emoji: "🧘‍♀️", title: "Physio Rx", sub: "Stretches for cramps", tint: "#d4f4e8" },
  game: { emoji: "👾", title: "Cramp Crusher", sub: "Squish the cramps", tint: "#ebe3ff" },
};

export function Stepper({
  value,
  min,
  max,
  onChange,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--line)] disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${unit}`}
      >
        <MinusIcon width={20} height={20} />
      </button>
      <div className="min-w-[88px] text-center">
        <span className="font-display text-4xl font-semibold text-accent">{value}</span>
        <span className="ml-1 text-sm font-semibold text-ink-soft">{unit}</span>
      </div>
      <button
        className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--line)] disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${unit}`}
      >
        <PlusIcon width={20} height={20} />
      </button>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h3 className="font-display text-xl font-semibold">{children}</h3>
      {action}
    </div>
  );
}
