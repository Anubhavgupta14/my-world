/**
 * Tiny WebAudio sound engine. Everything is synthesised in code, so there are
 * no audio files to load (or go missing). Nothing plays until the visitor
 * explicitly turns sound on — no autoplay, ever.
 */

export type SfxName =
  | "tap"
  | "pop"
  | "star"
  | "flip"
  | "match"
  | "miss"
  | "success"
  | "chime"
  | "whoosh"
  | "open"
  | "hour";

const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

/** A soft, music-box style progression in F major: Fmaj7 – Dm7 – B♭maj7 – Csus/C. */
const PROGRESSION = [
  { bass: 41, arp: [65, 69, 72, 76] },
  { bass: 38, arp: [62, 65, 69, 72] },
  { bass: 46, arp: [62, 65, 69, 70] },
  { bass: 36, arp: [64, 67, 72, 76] },
];
const PATTERN = [0, 1, 2, 3, 2, 1, 3, 2];
const BPM = 76;

interface VoiceOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  glideTo?: number;
  bus?: AudioNode;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;

  sfxOn = false;
  musicOn = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.connect(ctx.destination);

      const master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(compressor);

      const sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.5;
      sfxBus.connect(master);

      const musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);

      // A dreamy feedback echo for the music only.
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.42;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.3;
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 2400;
      const wet = ctx.createGain();
      wet.gain.value = 0.45;
      musicBus.connect(delay);
      delay.connect(tone);
      tone.connect(feedback);
      feedback.connect(delay);
      tone.connect(wet);
      wet.connect(master);

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      this.ctx = ctx;
      this.master = master;
      this.sfxBus = sfxBus;
      this.musicBus = musicBus;
      this.noise = buffer;

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) void ctx.suspend();
        else if (this.sfxOn || this.musicOn) void ctx.resume();
      });
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private voice(freq: number, t: number, dur: number, opts: VoiceOptions = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t + dur * 0.7);
    const peak = opts.gain ?? 0.2;
    const attack = opts.attack ?? 0.008;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env);
    env.connect(opts.bus ?? this.sfxBus!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private bell(freq: number, t: number, dur = 0.9, gain = 0.12, bus?: AudioNode) {
    this.voice(freq, t, dur, { gain, bus });
    this.voice(freq * 2.0, t, dur * 0.55, { gain: gain * 0.28, bus });
    this.voice(freq * 3.01, t, dur * 0.3, { gain: gain * 0.1, bus });
  }

  private breath(t: number, dur: number, from: number, to: number, gain: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus!);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  play(name: SfxName) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case "tap":
        this.bell(1318, t, 0.25, 0.06);
        break;
      case "pop":
        this.voice(520, t, 0.16, { glideTo: 1250, gain: 0.18 });
        this.bell(1568, t + 0.05, 0.3, 0.05);
        break;
      case "star":
        this.bell(1046, t, 0.5, 0.1);
        this.bell(1568, t + 0.08, 0.6, 0.09);
        this.bell(2093, t + 0.16, 0.7, 0.06);
        break;
      case "flip":
        this.breath(t, 0.12, 900, 2600, 0.12);
        this.voice(420, t, 0.08, { glideTo: 620, gain: 0.05, type: "triangle" });
        break;
      case "match":
        this.bell(784, t, 0.6, 0.1);
        this.bell(1175, t + 0.1, 0.8, 0.09);
        break;
      case "miss":
        this.voice(392, t, 0.22, { glideTo: 330, gain: 0.07, type: "triangle" });
        break;
      case "success":
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.bell(f, t + i * 0.09, 1.1, 0.09));
        break;
      case "chime":
        this.bell(1318, t, 1.2, 0.08);
        this.bell(1760, t + 0.12, 1.4, 0.06);
        break;
      case "whoosh":
        this.breath(t, 0.5, 300, 3200, 0.1);
        break;
      case "open":
        this.breath(t, 0.7, 250, 1800, 0.12);
        [698, 880, 1046, 1397].forEach((f, i) => this.bell(f, t + 0.35 + i * 0.12, 1.4, 0.07));
        break;
      case "hour":
        this.bell(880, t, 0.7, 0.06);
        break;
    }
  }

  setSfx(on: boolean, announce = false) {
    this.sfxOn = on;
    if (on && announce) {
      this.ensure();
      this.play("chime");
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    const ctx = this.ensure();
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    const gain = this.musicBus.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    if (on) {
      gain.linearRampToValueAtTime(0.55, now + 1.6);
      if (!this.timer) {
        this.nextTime = now + 0.12;
        this.step = 0;
        this.timer = setInterval(() => this.schedule(), 60);
      }
    } else {
      gain.linearRampToValueAtTime(0, now + 0.6);
      setTimeout(() => {
        if (!this.musicOn && this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      }, 800);
    }
  }

  private schedule() {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    const eighth = 60 / BPM / 2;
    while (this.nextTime < ctx.currentTime + 0.3) {
      const bar = Math.floor(this.step / 8) % PROGRESSION.length;
      const pos = this.step % 8;
      const chord = PROGRESSION[bar];
      this.bell(midi(chord.arp[PATTERN[pos]]), this.nextTime, 1.5, pos === 0 ? 0.075 : 0.055, bus);
      if (pos === 0) {
        this.voice(midi(chord.bass), this.nextTime, eighth * 8, { type: "triangle", gain: 0.06, attack: 0.12, bus });
        this.voice(midi(chord.bass + 12), this.nextTime, eighth * 8, { gain: 0.025, attack: 0.4, bus });
      }
      if (pos === 6 && bar === 3) {
        this.bell(midi(chord.arp[3] + 12), this.nextTime + eighth / 2, 1.2, 0.03, bus);
      }
      this.nextTime += eighth;
      this.step++;
    }
  }
}

export const sound = new SoundEngine();
