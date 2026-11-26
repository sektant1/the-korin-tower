// Áudio do Saiyajin Survivors em WebAudio. Cada evento da simulação (w.events) vira um som curto,
// com limite de repetição por som para que mil golpes por segundo não estourem o mixer.
// Se existir public/assets/survivors/sfx/manifest.json (gerado a partir do pacote do arcade DBZ2,
// GDD §13), as amostras dele substituem os sons sintetizados.
import type { SfxEvent } from "./sim/core";

type Synth = (ac: AudioContext, out: GainNode, t: number) => void;

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const lastAt = new Map<SfxEvent, number>();
const samples = new Map<string, AudioBuffer>();
let manifestTried = false;

/** Intervalo mínimo entre dois disparos do mesmo som (s). */
const GAP: Partial<Record<SfxEvent, number>> = { hit: 0.05, kill: 0.04, gem: 0.03, shot: 0.08, enemyShot: 0.12, blast: 0.06, slash: 0.08, beam: 0.15, hurt: 0.15, zap: 0.07, boom: 0.08, warn: 0.2, dodge: 0.1 };

function noiseBuffer(ctx: AudioContext) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
let noise: AudioBuffer | null = null;

function env(ctx: AudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, peak: number): Synth {
  return (ctx, out, t) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    o.connect(env(ctx, out, t, peak, 0.005, dur));
    o.start(t);
    o.stop(t + dur + 0.05);
  };
}

function burst(dur: number, peak: number, freq: number, q = 1): Synth {
  return (ctx, out, t) => {
    noise ??= noiseBuffer(ctx);
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.3), t + dur);
    f.Q.value = q;
    s.connect(f);
    f.connect(env(ctx, out, t, peak, 0.005, dur));
    s.start(t);
    s.stop(t + dur + 0.05);
  };
}

const both =
  (...fs: Synth[]): Synth =>
  (ctx, out, t) =>
    fs.forEach((f) => f(ctx, out, t));

const arp =
  (notes: number[], step: number, type: OscillatorType, peak: number): Synth =>
  (ctx, out, t) =>
    notes.forEach((n, i) => tone(type, n, n, step * 1.6, peak)(ctx, out, t + i * step));

const SYNTH: Record<SfxEvent, Synth> = {
  hit: burst(0.05, 0.12, 2200, 2),
  kill: tone("square", 520, 180, 0.07, 0.05),
  gem: tone("sine", 1200, 1800, 0.06, 0.05),
  levelup: arp([523, 659, 784, 1047], 0.07, "square", 0.08),
  beam: both(tone("sawtooth", 180, 900, 0.35, 0.06), burst(0.4, 0.08, 1500, 0.7)),
  shot: tone("triangle", 900, 400, 0.08, 0.06),
  blast: burst(0.3, 0.25, 600, 0.8),
  slash: burst(0.1, 0.15, 4000, 3),
  flash: both(tone("sine", 2000, 3000, 0.3, 0.08), burst(0.3, 0.06, 6000, 1)),
  hurt: both(tone("square", 220, 110, 0.12, 0.08), burst(0.1, 0.1, 800, 1)),
  transform: both(burst(1.2, 0.3, 900, 0.5), tone("sawtooth", 110, 440, 1.0, 0.08), arp([392, 523, 659, 784], 0.12, "square", 0.06)),
  chest: arp([784, 988, 1175, 1568], 0.06, "triangle", 0.1),
  boss: both(tone("sawtooth", 80, 50, 1.2, 0.14), burst(1, 0.15, 300, 0.6)),
  ball: arp([1047, 1319, 1568], 0.05, "sine", 0.1),
  wish: arp([392, 523, 659, 784, 1047, 1319], 0.1, "triangle", 0.1),
  senzu: arp([659, 880], 0.08, "sine", 0.1),
  elite: both(burst(0.5, 0.2, 400, 0.7), tone("square", 300, 80, 0.4, 0.06)),
  revive: arp([523, 784, 1047, 1568], 0.09, "sine", 0.12),
  enemyShot: tone("square", 400, 900, 0.06, 0.03),
  victory: arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, "square", 0.08),
  death: arp([392, 330, 262, 196], 0.18, "triangle", 0.1),
  zap: both(burst(0.12, 0.12, 5000, 4), tone("sawtooth", 1400, 300, 0.1, 0.04)),
  boom: both(burst(0.35, 0.22, 400, 0.6), tone("sine", 120, 40, 0.3, 0.12)),
  scroll: arp([440, 554, 659, 880, 1109], 0.09, "triangle", 0.1),
  dodge: tone("sine", 1800, 2600, 0.08, 0.06),
  warn: tone("square", 880, 880, 0.08, 0.025),
  gold: arp([1047, 1319, 1568, 2093], 0.05, "square", 0.07),
};

async function loadManifest(ctx: AudioContext) {
  if (manifestTried) return;
  manifestTried = true;
  try {
    const res = await fetch("/assets/survivors/sfx/manifest.json");
    if (!res.ok) return;
    const map = (await res.json()) as Record<string, string>;
    await Promise.all(
      Object.entries(map).map(async ([event, file]) => {
        const r = await fetch(`/assets/survivors/sfx/${file}`);
        if (r.ok) samples.set(event, await ctx.decodeAudioData(await r.arrayBuffer()));
      }),
    );
  } catch {
    /* sem pacote de sons: fica o sintetizado */
  }
}

/** Cria/destrava o contexto. Chame num gesto do usuário (clique, tecla). */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ac) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.6;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ac.destination);
    void loadManifest(ac);
  }
  if (ac.state === "suspended") void ac.resume();
}

export function setMute(m: boolean) {
  muted = m;
  if (master && ac) master.gain.setTargetAtTime(m ? 0 : 0.6, ac.currentTime, 0.02);
}

export function play(e: SfxEvent) {
  if (!ac || !master || muted || ac.state !== "running") return;
  const now = ac.currentTime;
  const gap = GAP[e] ?? 0.03;
  if (now - (lastAt.get(e) ?? -1) < gap) return;
  lastAt.set(e, now);
  const buf = samples.get(e);
  if (buf) {
    const s = ac.createBufferSource();
    s.buffer = buf;
    const g = ac.createGain();
    g.gain.value = 0.7;
    s.connect(g);
    g.connect(master);
    s.start(now);
    return;
  }
  SYNTH[e](ac, master, now);
}

/** Toca e esvazia a fila de eventos da simulação. */
export function drain(events: SfxEvent[]) {
  for (const e of events) play(e);
  events.length = 0;
}
