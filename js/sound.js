// Sonidos sintetizados con WebAudio (sin archivos) + voz en español.
let ctx = null;
let enabled = true;
let voiceOn = true;
let voice = null;

export function configure({ sound, voice: v, voiceURI }) {
  enabled = sound;
  voiceOn = v;
  if (voiceURI !== undefined) setVoice(voiceURI);
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

// Voces femeninas en español, de mejor a peor. En iPad se pueden bajar versiones
// "Mejorada"/"Premium" en Ajustes > Accesibilidad > Contenido leído > Voces.
const GOOD = ['paulina', 'mónica', 'monica', 'marisol', 'angélica', 'angelica', 'soledad', 'francisca', 'isabela', 'paloma', 'esperanza', 'lucía', 'lucia', 'elvira', 'dalia', 'helena', 'sabina', 'google español'];
const BAD = ['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley', 'diego', 'jorge', 'juan', 'carlos', 'pablo', 'enrique', 'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'junior', 'ralph', 'fred', 'kathy'];
let preferred = '';

export function spanishVoices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('es'));
}

function score(v) {
  const n = v.name.toLowerCase();
  if (BAD.some((b) => n.includes(b))) return -100;
  let s = 0;
  const i = GOOD.findIndex((g) => n.includes(g));
  if (i >= 0) s += 50 - i;
  if (/premium|mejorad|enhanced|neural|natural/.test(n)) s += 40;
  if (/es-(mx|us|419|ar)/i.test(v.lang)) s += 5;
  if (v.localService) s += 2;
  return s;
}

function pickVoice() {
  const vs = spanishVoices();
  if (!vs.length) return;
  voice = (preferred && vs.find((v) => v.voiceURI === preferred)) || vs.slice().sort((a, b) => score(b) - score(a))[0];
  if (!preferred && score(voice) < 0) voice = null; // mejor callar que una voz fea
}

export function setVoice(uri) { preferred = uri || ''; pickVoice(); }
export function currentVoice() { return voice; }

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = pickVoice;
  pickVoice();
}

export function say(text, { force = false } = {}) {
  if ((!voiceOn && !force) || !('speechSynthesis' in window) || !voice) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* sin voz */ }
}
