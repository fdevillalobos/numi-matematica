// Sonidos sintetizados con WebAudio (sin archivos) + voz en español.
let ctx = null;
let enabled = true;
let voiceOn = true;
let voice = null;

export function configure({ sound, voice: v }) {
  enabled = sound;
  voiceOn = v;
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// iOS necesita "desbloquear" el audio con un toque.
export function unlock() { ac(); pickVoice(); }

function tone(freq, start, dur, { type = 'sine', gain = 0.18, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const SFX = {
  tap: () => tone(660, 0, 0.06, { type: 'triangle', gain: 0.08 }),
  key: () => tone(520, 0, 0.05, { type: 'triangle', gain: 0.07 }),
  correct: () => { tone(784, 0, 0.12, { type: 'triangle' }); tone(1047, 0.09, 0.22, { type: 'triangle' }); },
  combo: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.16, { type: 'triangle', gain: 0.14 })); },
  wrong: () => { tone(330, 0, 0.18, { type: 'sine', gain: 0.14, slide: 0.8 }); tone(262, 0.14, 0.25, { type: 'sine', gain: 0.12, slide: 0.85 }); },
  pop: () => tone(900, 0, 0.08, { type: 'square', gain: 0.05, slide: 0.4 }),
  coin: () => { tone(988, 0, 0.08, { type: 'square', gain: 0.05 }); tone(1319, 0.07, 0.18, { type: 'square', gain: 0.05 }); },
  star: () => { tone(1319, 0, 0.1, { type: 'triangle', gain: 0.12 }); tone(1760, 0.08, 0.25, { type: 'triangle', gain: 0.1 }); },
  levelup: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, { type: 'triangle', gain: 0.15 })); },
  fanfare: () => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, i === 6 ? 0.6 : 0.18, { type: 'triangle', gain: 0.15 })); },
  tick: () => tone(1200, 0, 0.03, { type: 'square', gain: 0.03 }),
  whoosh: () => tone(300, 0, 0.3, { type: 'sawtooth', gain: 0.03, slide: 3 }),
};

export function sfx(name) {
  if (!enabled) return;
  try { SFX[name]?.(); } catch (e) { /* sin audio */ }
}

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => v.lang === 'es-AR') || vs.find((v) => v.lang === 'es-MX') || vs.find((v) => v.lang === 'es-US') || vs.find((v) => v.lang?.startsWith('es')) || null;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function say(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang || 'es-ES';
    if (voice) u.voice = voice;
    u.rate = 1.0;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
  } catch (e) { /* sin voz */ }
}
