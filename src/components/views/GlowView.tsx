import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buzz } from "@/lib/fx";
import {
  OCCASIONS,
  PROFILE_FIELDS,
  fileToCompressed,
  glow,
  type Analysis,
  type Difficulty,
  type GlowProfile,
  type Look,
  type Trend,
  type Tutorial,
} from "@/lib/glow";
import { Markdown } from "../Markdown";
import { Sheet } from "../Sheet";
import { SparkleIcon } from "../icons";
import { SectionTitle } from "../ui";

/* ---------------------------------------------------------------
   Module store: keeps results across tab switches so we don't
   re-spend Gemini quota every time she reopens the tab.
   --------------------------------------------------------------- */
interface GlowCache {
  profile: GlowProfile;
  saved: Look[];
  trend?: Trend;
  looks: Record<string, Look[]>;
  loaded: boolean;
}
let gstate: GlowCache = { profile: {}, saved: [], looks: {}, loaded: false };
const glisteners = new Set<() => void>();
const gget = () => gstate;
function gset(patch: Partial<GlowCache>) {
  gstate = { ...gstate, ...patch };
  glisteners.forEach((l) => l());
}
function useGlow(): GlowCache {
  return useSyncExternalStore(
    (cb) => {
      glisteners.add(cb);
      return () => glisteners.delete(cb);
    },
    gget,
    gget,
  );
}

const DIFF: Record<Difficulty, { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "bg-mint-soft text-mint" },
  medium: { label: "Medium", cls: "bg-sun-soft text-[#a86a00]" },
  glam: { label: "Glam", cls: "bg-lilac-soft text-lilac" },
};

export function GlowView() {
  const root = useRef<HTMLDivElement>(null);
  const data = useGlow();

  const [occasion, setOccasion] = useState("everyday");
  const [loadingLooks, setLoadingLooks] = useState(false);
  const [trendBusy, setTrendBusy] = useState(false);
  const [error, setError] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [activeLook, setActiveLook] = useState<Look | null>(null);
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [tutorialBusy, setTutorialBusy] = useState(false);
  const [tutorialIntro, setTutorialIntro] = useState("");

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [photoBusy, setPhotoBusy] = useState<"recreate" | "analyze" | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [askBusy, setAskBusy] = useState(false);

  const inspoInput = useRef<HTMLInputElement>(null);
  const selfieInput = useRef<HTMLInputElement>(null);

  // First load: profile + saved looks, then today's trend.
  useEffect(() => {
    if (data.loaded) return;
    let alive = true;
    (async () => {
      try {
        const s = await glow.state();
        if (!alive) return;
        gset({ profile: s.profile, saved: s.saved, loaded: true });
        const { trend } = await glow.trends();
        if (alive) gset({ trend });
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [data.loaded]);

  useGSAP(() => {
    gsap.from(".g-reveal", { y: 24, opacity: 0, duration: 0.6, stagger: 0.07, ease: "power3.out" });
  }, { scope: root });

  const refreshTrend = async () => {
    setTrendBusy(true);
    setError("");
    try {
      const { trend } = await glow.trends();
      gset({ trend });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrendBusy(false);
    }
  };

  const loadLooks = async (id: string, force = false) => {
    if (!force && gget().looks[id]?.length) return;
    setLoadingLooks(true);
    setError("");
    try {
      const { looks } = await glow.looks(id);
      gset({ looks: { ...gget().looks, [id]: looks } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingLooks(false);
    }
  };

  const chooseOccasion = (id: string) => {
    buzz(8);
    setOccasion(id);
    void loadLooks(id);
  };

  const openTutorial = async (look: Look) => {
    buzz(10);
    setActiveLook(look);
    setTutorial(null);
    setTutorialIntro("");
    setTutorialBusy(true);
    try {
      const { tutorial } = await glow.tutorial(look);
      setTutorial(tutorial);
    } catch (e) {
      setError((e as Error).message);
      setActiveLook(null);
    } finally {
      setTutorialBusy(false);
    }
  };

  const toggleSave = async (look: Look) => {
    buzz(8);
    const has = gget().saved.some((l) => l.id === look.id);
    gset({ saved: has ? gget().saved.filter((l) => l.id !== look.id) : [look, ...gget().saved] });
    try {
      if (has) await glow.removeLook(look.id);
      else await glow.saveLook(look);
    } catch {
      /* best effort; UI already updated */
    }
  };

  const onPhoto = async (file: File | undefined, kind: "recreate" | "analyze") => {
    if (!file) return;
    setError("");
    setPhotoBusy(kind);
    try {
      const image = await fileToCompressed(file);
      if (kind === "recreate") {
        const { intro, tutorial } = await glow.recreate(image);
        setActiveLook({ id: "photo", name: "Your inspo look" } as Look);
        setTutorialIntro(intro);
        setTutorial(tutorial);
      } else {
        const { analysis } = await glow.analyze(image);
        setAnalysis(analysis);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhotoBusy(null);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || askBusy) return;
    setAskBusy(true);
    setAnswer("");
    setError("");
    try {
      await glow.ask(q, (full) => setAnswer(full));
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAskBusy(false);
    }
  };

  const hasProfile = Object.values(data.profile).some(Boolean);
  const savedIds = new Set(data.saved.map((l) => l.id));
  const looks = data.looks[occasion] ?? [];

  return (
    <div ref={root} className="space-y-6 pb-6">
      <header className="g-reveal flex items-start justify-between pt-2">
        <div>
          <p className="text-sm font-semibold text-ink-soft">Your beauty studio</p>
          <h1 className="font-display text-[28px] leading-tight font-semibold">Glow ✨</h1>
        </div>
        <button onClick={() => setProfileOpen(true)} className="rounded-full bg-accent-soft px-4 py-2 text-sm font-bold text-accent">
          {hasProfile ? "Your profile" : "Set profile"}
        </button>
      </header>

      {!hasProfile && (
        <button onClick={() => setProfileOpen(true)} className="g-reveal card w-full p-4 text-left">
          <p className="font-semibold">✨ Tell me about your skin</p>
          <p className="mt-0.5 text-sm text-ink-soft">Tone, undertone and type — so every look is made for you.</p>
        </button>
      )}

      {error && <p className="g-reveal rounded-2xl bg-berry-soft p-3 text-center text-sm font-medium text-berry">{error}</p>}

      {/* Trending now */}
      <section className="g-reveal card p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5">
            <SparkleIcon width={14} height={14} className="text-accent" /> Trending now
          </p>
          <button onClick={refreshTrend} disabled={trendBusy} className="text-xs font-bold text-accent disabled:opacity-50">
            {trendBusy ? "…" : "Refresh"}
          </button>
        </div>
        {data.trend ? (
          <>
            <Markdown text={data.trend.summary} className="mt-2 text-[15px] leading-snug" />
            <ul className="mt-3 space-y-1.5">
              {data.trend.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <span className="text-accent">✦</span> {h}
                </li>
              ))}
            </ul>
            {data.trend.sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.trend.sources.slice(0, 3).map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                    {hostOf(s.url)} ↗
                  </a>
                ))}
              </div>
            )}
            {!data.trend.live && <p className="mt-2 text-[11px] text-ink-soft italic">Live web is off — from Glow&apos;s own knowledge.</p>}
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{trendBusy || !data.loaded ? "Reading the room…" : "Tap refresh for what's trending."}</p>
        )}
      </section>

      {/* Looks by occasion */}
      <section className="g-reveal">
        <SectionTitle
          action={
            looks.length ? (
              <button onClick={() => loadLooks(occasion, true)} disabled={loadingLooks} className="text-xs font-bold text-accent disabled:opacity-50">
                Shuffle
              </button>
            ) : undefined
          }
        >
          Looks for you
        </SectionTitle>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {OCCASIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => chooseOccasion(o.id)}
              aria-pressed={occasion === o.id}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                occasion === o.id ? "bg-accent text-white" : "bg-white text-ink shadow-[inset_0_0_0_1.5px_var(--line)]"
              }`}
            >
              {o.emoji} {o.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {loadingLooks && <LookSkeleton />}
          {!loadingLooks && !looks.length && (
            <button onClick={() => loadLooks(occasion)} className="card w-full p-5 text-center text-sm text-ink-soft">
              Tap an occasion to see looks made for you 💄
            </button>
          )}
          {looks.map((look) => (
            <LookCard key={look.id} look={look} saved={savedIds.has(look.id)} onOpen={() => openTutorial(look)} onSave={() => toggleSave(look)} />
          ))}
        </div>
      </section>

      {/* Photo tools */}
      <section className="g-reveal">
        <SectionTitle>From a photo</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => inspoInput.current?.click()} disabled={photoBusy !== null} className="card flex flex-col items-start gap-1 p-4 text-left disabled:opacity-60">
            <span className="text-3xl">📸</span>
            <span className="font-display font-semibold">Recreate a look</span>
            <span className="text-xs text-ink-soft">{photoBusy === "recreate" ? "Studying it…" : "Upload an inspo photo"}</span>
          </button>
          <button onClick={() => selfieInput.current?.click()} disabled={photoBusy !== null} className="card flex flex-col items-start gap-1 p-4 text-left disabled:opacity-60">
            <span className="text-3xl">🪞</span>
            <span className="font-display font-semibold">What suits me?</span>
            <span className="text-xs text-ink-soft">{photoBusy === "analyze" ? "Looking…" : "Take or pick a selfie"}</span>
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-ink-soft">Photos are read by the AI for advice and never stored. 💗</p>
        <input
          ref={inspoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onPhoto(f, "recreate");
          }}
        />
        <input
          ref={selfieInput}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onPhoto(f, "analyze");
          }}
        />
      </section>

      {/* Ask Glow */}
      <section className="g-reveal card p-5">
        <SectionTitle>Ask Glow</SectionTitle>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="e.g. how do I stop foundation creasing?"
            className="text-input flex-1"
          />
          <button onClick={ask} disabled={askBusy || !question.trim()} className="btn btn-primary !px-5 disabled:opacity-50">
            {askBusy ? "…" : "Ask"}
          </button>
        </div>
        {(answer || askBusy) && (
          <div className="mt-3 rounded-2xl bg-accent-soft p-3.5 text-[15px] leading-snug">
            {answer ? <Markdown text={answer} /> : <span className="text-ink-soft">Glow is thinking…</span>}
            {askBusy && answer && <span className="ml-0.5 inline-block w-1.5 animate-pulse">▍</span>}
          </div>
        )}
      </section>

      {/* Saved looks */}
      {data.saved.length > 0 && (
        <section className="g-reveal">
          <SectionTitle>Saved looks 💗</SectionTitle>
          <div className="space-y-3">
            {data.saved.map((look) => (
              <LookCard key={look.id} look={look} saved onOpen={() => openTutorial(look)} onSave={() => toggleSave(look)} />
            ))}
          </div>
        </section>
      )}

      {/* ---- Sheets ---- */}
      <ProfileSheet
        open={profileOpen}
        profile={data.profile}
        onClose={() => setProfileOpen(false)}
        onSave={async (p) => {
          gset({ profile: p });
          setProfileOpen(false);
          try {
            await glow.saveProfile(p);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />

      <Sheet open={activeLook !== null} onClose={() => setActiveLook(null)} eyebrow="Tutorial" title={activeLook?.name ?? ""} full>
        {tutorialBusy && <p className="py-10 text-center text-ink-soft">Writing your step-by-step… 💄</p>}
        {tutorialIntro && <Markdown text={tutorialIntro} className="mb-4 rounded-2xl bg-accent-soft p-3.5 text-[15px] leading-snug" />}
        {tutorial && <TutorialBody t={tutorial} />}
      </Sheet>

      <Sheet open={analysis !== null} onClose={() => setAnalysis(null)} eyebrow="Your colours" title="What suits you">
        {analysis && <AnalysisBody a={analysis} />}
      </Sheet>
    </div>
  );
}

/* ---------- Pieces ---------- */

function LookCard({ look, saved, onOpen, onSave }: { look: Look; saved: boolean; onOpen: () => void; onSave: () => void }) {
  const d = DIFF[look.difficulty] ?? DIFF.medium;
  return (
    <div className="card overflow-hidden">
      <button onClick={onOpen} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight font-semibold">{look.name}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{look.vibe}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${d.cls}`}>{d.label}</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {(look.palette ?? []).slice(0, 6).map((c, i) => (
            <span key={i} className="h-6 w-6 rounded-full shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.08)]" style={{ background: safeColor(c) }} />
          ))}
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <button onClick={onOpen} className="text-sm font-bold text-accent">
          How to do it →
        </button>
        <button onClick={onSave} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save look"} className="text-xl">
          {saved ? "💗" : "🤍"}
        </button>
      </div>
    </div>
  );
}

function TutorialBody({ t }: { t: Tutorial }) {
  const shopping = t.shopping ?? [];
  return (
    <div className="pb-4">
      <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">⏱️ about {Math.round(t.minutes)} min</p>
      <ol className="relative space-y-4 pl-8">
        <span className="absolute top-2 bottom-2 left-[0.9rem] w-px bg-line" />
        {t.steps.map((s, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-8 grid h-7 w-7 place-items-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
            <p className="font-semibold">{s.title}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{s.detail}</p>
            {s.tip && <p className="mt-1 text-xs text-accent">💡 {s.tip}</p>}
          </li>
        ))}
      </ol>
      {shopping.length > 0 && (
        <div className="mt-6">
          <p className="eyebrow mb-2">Shopping list</p>
          <div className="space-y-2">
            {shopping.map((p, i) => (
              <div key={i} className="card flex items-center justify-between gap-3 p-3">
                <span className="text-sm font-semibold">{p.type}</span>
                <span className="text-right text-xs text-ink-soft">{p.suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisBody({ a }: { a: Analysis }) {
  return (
    <div className="space-y-4 pb-4">
      <Markdown text={a.summary} className="text-[15px] leading-snug" />
      <div className="card p-4">
        <p className="eyebrow">Your undertone</p>
        <p className="mt-1 font-display text-xl font-semibold text-accent">{a.undertone}</p>
      </div>
      <div>
        <p className="eyebrow mb-2">Colours that flatter you</p>
        <div className="flex flex-wrap gap-2">
          {a.flatters.map((f, i) => (
            <span key={i} className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">{f}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-2">Tips</p>
        <ul className="space-y-1.5">
          {a.tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-soft">
              <span className="text-accent">✦</span> {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProfileSheet({
  open,
  profile,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: GlowProfile;
  onClose: () => void;
  onSave: (p: GlowProfile) => void;
}) {
  const [draft, setDraft] = useState<GlowProfile>(profile);
  const [seen, setSeen] = useState(open);
  if (open !== seen) {
    setSeen(open);
    if (open) setDraft(profile);
  }

  const pick = (key: keyof GlowProfile, value: string) =>
    setDraft((d) => ({ ...d, [key]: d[key] === value ? undefined : value }));

  return (
    <Sheet open={open} onClose={onClose} eyebrow="About you" title="Your beauty profile">
      <div className="space-y-5 pb-4">
        {(Object.keys(PROFILE_FIELDS) as (keyof typeof PROFILE_FIELDS)[]).map((key) => (
          <div key={key}>
            <p className="mb-2 text-sm font-semibold">{PROFILE_FIELDS[key].label}</p>
            <div className="flex flex-wrap gap-2">
              {PROFILE_FIELDS[key].options.map((opt) => (
                <button key={opt} className="chip" aria-pressed={draft[key] === opt} onClick={() => pick(key, opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div>
          <p className="mb-2 text-sm font-semibold">Anything else?</p>
          <input
            className="text-input"
            placeholder="Allergies, favourites, things to avoid…"
            value={draft.notes ?? ""}
            maxLength={200}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          />
        </div>
        <button className="btn btn-primary w-full" onClick={() => onSave(draft)}>
          Save profile
        </button>
      </div>
    </Sheet>
  );
}

function LookSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="card animate-pulse p-4">
          <div className="h-5 w-1/2 rounded bg-line" />
          <div className="mt-2 h-4 w-3/4 rounded bg-line" />
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2, 3].map((j) => (
              <span key={j} className="h-6 w-6 rounded-full bg-line" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

/** Only allow safe hex colours into inline style. */
function safeColor(c: string): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : "var(--line)";
}
