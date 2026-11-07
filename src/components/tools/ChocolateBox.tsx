import gsap from "gsap";
import { useRef, useState } from "react";
import type { Settings } from "@/lib/cycle";
import { buzz, burst } from "@/lib/fx";
import { actions } from "@/lib/store";
import { GiftBox, Rasgulla } from "../illustrations";

/* Real, hardcoded treats. She picks, "claims", and it reaches him for a surprise delivery. */
const ITEMS: { id: string; name: string; emoji?: string; fav?: boolean }[] = [
  { id: "kitkat", name: "KitKat", emoji: "🍫" },
  { id: "silk", name: "Dairy Milk Silk", emoji: "🍫" },
  { id: "dairymilk", name: "Cadbury Dairy Milk", emoji: "🍫" },
  { id: "amuldark", name: "Amul Dark Chocolate", emoji: "🖤" },
  { id: "ferrero", name: "Ferrero Rocher", emoji: "✨" },
  { id: "darkfantasy", name: "Dark Fantasy", emoji: "🍪" },
  { id: "oreo", name: "Oreo", emoji: "🍪" },
  { id: "amulicecream", name: "Amul Ice Cream", emoji: "🍨" },
  { id: "cornetto", name: "Cornetto", emoji: "🍦" },
  { id: "kulfi", name: "Kulfi", emoji: "🍧" },
  { id: "rasgulla", name: "Rasgulla", fav: true },
  { id: "gems", name: "Cadbury Gems", emoji: "🌈" },
];

/** Ask the browser for location. Never throws; reports why it failed so the email can say so. */
function getLocation(): Promise<{ loc: { lat: number; lng: number } | null; error?: string }> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({ loc: null, error: "This device can't share location." });
  }
  if (!window.isSecureContext) {
    return Promise.resolve({ loc: null, error: "Location needs a secure (HTTPS) connection." });
  }
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ loc: { lat: Number(p.coords.latitude.toFixed(5)), lng: Number(p.coords.longitude.toFixed(5)) } }),
      (err) =>
        resolve({
          loc: null,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied."
              : err.code === err.POSITION_UNAVAILABLE
                ? "Location unavailable — check the device's location services are on."
                : "Location request timed out.",
        }),
      // Low accuracy is far more reliable on laptops (uses Wi-Fi, not GPS) and plenty for delivery.
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 },
    ),
  );
}

type Status = "idle" | "sending" | "done" | "error";

export function ChocolateBox({ settings }: { settings: Settings }) {
  const root = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [ordered, setOrdered] = useState<typeof ITEMS>([]);
  const [error, setError] = useState("");

  const openBox = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (opened) return;
    const el = e.currentTarget;
    buzz([10, 40, 20]);
    gsap
      .timeline()
      .to(el, { rotation: -4, duration: 0.08, yoyo: true, repeat: 5, ease: "none" })
      .to(el.querySelector(".gift-lid"), { y: -90, x: 40, rotation: 35, opacity: 0, duration: 0.6, ease: "power2.out" })
      .add(() => {
        burst(el, ["🍫", "✨", "💗", "🍬"], 16);
        setOpened(true);
      }, "-=0.4");
  };

  const toggle = (id: string, el: HTMLElement) => {
    buzz(8);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        burst(el, ["💗", "✨"], 6);
      }
      return next;
    });
  };

  const claim = async () => {
    if (!selected.size || status === "sending") return;
    setStatus("sending");
    setError("");
    buzz([10, 30, 10]);
    const { loc, error: locError } = await getLocation();
    const picked = ITEMS.filter((i) => selected.has(i.id));
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: picked.map((i) => i.name), location: loc, locationError: loc ? undefined : locError }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Couldn't send the claim.");
      actions.openTreat();
      setOrdered(picked);
      setStatus("done");
      buzz([20, 50, 20, 50, 40]);
      if (root.current) burst(root.current, ["🍫", "💗", "✨", "🛵"], 20);
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  };

  const reset = () => {
    setSelected(new Set());
    setStatus("idle");
    setError("");
  };

  /* ---- Closed box ---- */
  if (!opened) {
    return (
      <div ref={root} className="flex flex-col items-center pt-4 pb-6 text-center">
        <button onClick={openBox} className="float" aria-label="Open the chocolate box">
          <GiftBox size={210} />
        </button>
        <p className="mt-4 font-display text-xl font-semibold">A box arrived for you!</p>
        <p className="mt-1 text-sm text-ink-soft">Sender: {settings.partnerName}. Tap to open.</p>
      </div>
    );
  }

  /* ---- Confirmation: an order receipt of the picked treats ---- */
  if (status === "done") {
    return (
      <div ref={root} className="flex flex-col items-center py-6 text-center">
        <span className="float text-7xl">🛵</span>
        <p className="mt-4 font-display text-2xl font-semibold">Here is your claim! 💗</p>
        <p className="mt-1 max-w-[320px] text-sm text-ink-soft">
          Here are your treats, {settings.herName}
        </p>

        <div className="mt-5 w-full space-y-2.5 text-left">
          {ordered.map((t) => (
            <div key={t.id} className="card flex items-center gap-3 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl">
                {t.emoji ?? <Rasgulla size={30} />}
              </span>
              <span className="flex-1 font-semibold">
                {t.name}
                {t.fav && <span className="ml-1 text-[11px] text-berry">your favourite 💗</span>}
              </span>
              <span className="text-xs font-bold text-mint">Ready ✓</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary mt-6 w-full" onClick={reset}>
          Claim something else
        </button>
      </div>
    );
  }

  /* ---- Picker ---- */
  const count = selected.size;
  return (
    <div ref={root} className="pb-4">
      <p className="mb-4 text-center text-sm text-ink-soft">Pick what you&apos;re craving. As many as you like. 💗</p>
      <div className="grid grid-cols-2 gap-3 [perspective:800px]">
        {ITEMS.map((t, i) => {
          const on = selected.has(t.id);
          return (
            <button
              key={t.id}
              onClick={(e) => toggle(t.id, e.currentTarget)}
              aria-pressed={on}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`treat pop-in relative flex min-h-[116px] flex-col items-center justify-center gap-1.5 rounded-3xl p-3 text-center transition-colors ${
                on ? "bg-accent-soft shadow-[inset_0_0_0_2.5px_var(--accent)]" : "card"
              }`}
            >
              {on && (
                <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-sm text-white">
                  ✓
                </span>
              )}
              <span className={`inline-block text-4xl ${on ? "wiggle" : ""}`}>
                {t.emoji ?? <Rasgulla size={46} />}
              </span>
              <span className="text-sm leading-tight font-semibold">{t.name}</span>
              {t.fav && <span className="text-[11px] text-berry">your favourite 💗</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 rounded-2xl bg-berry-soft p-3 text-center text-sm font-medium text-berry">{error}</p>}

      <div className="mt-6 flex flex-col gap-2.5">
        <button onClick={claim} disabled={!count || status === "sending"} className="btn btn-primary disabled:opacity-50">
          {status === "sending" ? "Getting…" : count ? `Claim ${count} treat${count > 1 ? "s" : ""} 🛵` : "Pick a treat first"}
        </button>
        
      </div>
    </div>
  );
}
