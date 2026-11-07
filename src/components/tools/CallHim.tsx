import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { SOS_PRESETS, telLink, whatsappLink } from "@/lib/cheer";
import type { Settings } from "@/lib/cycle";
import { buzz } from "@/lib/fx";
import { ChatIcon, PhoneIcon } from "../icons";

export function CallHim({ settings }: { settings: Settings }) {
  const root = useRef<HTMLDivElement>(null);
  const initial = settings.partnerName.replace(/^the\s+/i, "").charAt(0).toUpperCase() || "♥";
  const hasPhone = settings.partnerPhone.replace(/\D/g, "").length >= 8;

  useGSAP(
    () => {
      gsap.fromTo(
        ".pulse-ring",
        { scale: 0.8, opacity: 0.7 },
        { scale: 1.8, opacity: 0, duration: 2.2, repeat: -1, stagger: 0.7, ease: "power1.out" },
      );
      gsap.from(".preset", { y: 20, opacity: 0, stagger: 0.06, duration: 0.5, ease: "power3.out", delay: 0.2 });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="pb-4">
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="relative grid h-32 w-32 place-items-center">
          <span className="pulse-ring absolute inset-0 rounded-full bg-berry/30" />
          <span className="pulse-ring absolute inset-0 rounded-full bg-berry/30" />
          <span className="pulse-ring absolute inset-0 rounded-full bg-berry/30" />
          <span className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-berry to-lilac font-display text-5xl font-semibold text-white shadow-lg">
            {initial}
          </span>
        </div>
        <p className="mt-4 font-display text-2xl font-semibold">{settings.partnerName}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 text-xs font-bold text-mint">
          <span className="h-2 w-2 rounded-full bg-mint" /> On call 24/7 · for you only
        </p>
        <p className="mt-3 max-w-[300px] text-sm text-ink-soft">
          Average response time: faster than your Wi-Fi. Specialises in listening, agreeing, and sending snacks.
        </p>
      </div>

      {hasPhone ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <a href={telLink(settings.partnerPhone)} onClick={() => buzz(20)} className="btn btn-primary">
              <PhoneIcon width={20} height={20} /> Call
            </a>
            <a
              href={whatsappLink(settings.partnerPhone, "Hey Baby 💗")}
              target="_blank"
              rel="noreferrer"
              className="btn btn-soft"
            >
              <ChatIcon width={20} height={20} /> Message
            </a>
          </div>

          <p className="eyebrow mt-7 mb-3">Quick SOS (opens WhatsApp)</p>
          <div className="space-y-2.5">
            {SOS_PRESETS.map((p) => (
              <a
                key={p.label}
                href={whatsappLink(settings.partnerPhone, p.text)}
                target="_blank"
                rel="noreferrer"
                onClick={() => buzz(10)}
                className="preset card flex items-center gap-3 p-3.5 active:scale-[0.98]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl">
                  {p.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{p.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{p.text}</span>
                </span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="card mt-6 p-5 text-center">
          <p className="font-semibold">His number isn&apos;t saved yet.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Tell {settings.partnerName} to add it. Yes, this is his job. 🛠️
          </p>
        </div>
      )}
    </div>
  );
}
