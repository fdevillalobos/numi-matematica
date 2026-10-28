// Motor de matemática: niveles, generación de problemas, dominio y adaptación.
// Módulo puro (sin DOM) para poder testearlo con Node.

let rand = Math.random;
export function setRandom(fn) { rand = fn; }

const rnd = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const OPS = {
  add: { sym: '+', word: 'más' },
  sub: { sym: '−', word: 'menos' },
  mul: { sym: '×', word: 'por' },
  div: { sym: '÷', word: 'dividido' },
};

export const WORLDS = [
  { id: 'add', name: 'Isla de las Sumas', short: 'Sumas', emoji: '🏝️', color: '#FF8A3D', dark: '#D9631A', soft: '#FFE3CC' },
  { id: 'sub', name: 'Bosque de las Restas', short: 'Restas', emoji: '🌳', color: '#2EC27E', dark: '#1E9A60', soft: '#D3F5E3' },
  { id: 'mul', name: 'Galaxia de las Multiplicaciones', short: 'Multiplicar', emoji: '🚀', color: '#8B5CF6', dark: '#6A3FD6', soft: '#E9E0FF' },
  { id: 'div', name: 'Castillo de las Divisiones', short: 'Dividir', emoji: '🏰', color: '#3B9EFF', dark: '#1F7AD6', soft: '#D9ECFF' },
];

const digits = (n) => ({ t: Math.floor(n / 10) % 10, u: n % 10 });

// Cada nivel: id, mundo, nombre, segundos objetivo (fluidez) y generador -> [a, b]
const tableGen = (tables) => () => {
  const t = pick(tables);
  const x = rnd(1, 10);
  return chance(0.3) ? [x, t] : [t, x];
};
const divGen = (divisors) => () => {
  const d = pick(divisors);
  const q = rnd(1, 10);
  return [d * q, d];
};

export const SKILLS = [
  // Sumas
  { id: 'add1', op: 'add', name: 'Sumas hasta 5', target: 3, gen: () => { const a = rnd(1, 4); return [a, rnd(1, 5 - a)]; } },
  { id: 'add2', op: 'add', name: 'Sumas hasta 10', target: 4, gen: () => { let a, b; do { a = rnd(1, 9); b = rnd(1, 10 - a); } while (a + b < 5); return [a, b]; } },
  { id: 'add3', op: 'add', name: 'Sumas hasta 20', target: 5, gen: () => {
    if (chance(0.7)) { let a, b; do { a = rnd(2, 9); b = rnd(2, 9); } while (a + b < 11); return [a, b]; }
    const a = rnd(11, 18); return [a, rnd(1, 9 - (a % 10))];
  } },
  { id: 'add4', op: 'add', name: 'Decenas y unidades', target: 6, gen: () => {
    if (chance(0.3)) { const a = rnd(1, 8); return [a * 10, rnd(1, 9 - a) * 10]; }
    let a; do { a = rnd(11, 88); } while (a % 10 === 9); return [a, rnd(1, 9 - (a % 10))];
  } },
  { id: 'add5', op: 'add', name: 'Dos cifras sin llevar', target: 8, gen: () => {
    const t1 = rnd(1, 8), t2 = rnd(1, 9 - t1), u1 = rnd(0, 9), u2 = rnd(0, 9 - u1);
    return [t1 * 10 + u1, t2 * 10 + u2];
  } },
  { id: 'add6', op: 'add', name: 'Dos cifras llevando', target: 10, gen: () => {
    const t1 = rnd(1, 7), t2 = rnd(1, 8 - t1); let u1, u2; do { u1 = rnd(1, 9); u2 = rnd(1, 9); } while (u1 + u2 < 10);
    return [t1 * 10 + u1, t2 * 10 + u2];
  } },
  { id: 'add7', op: 'add', name: 'Tres cifras', target: 14, gen: () => { const a = rnd(100, 799); return [a, rnd(100, 999 - a)]; } },
  // Restas
  { id: 'sub1', op: 'sub', name: 'Restas hasta 5', target: 3, gen: () => { const a = rnd(2, 5); return [a, rnd(1, a - 1)]; } },
  { id: 'sub2', op: 'sub', name: 'Restas hasta 10', target: 4, gen: () => { const a = rnd(5, 10); return [a, rnd(1, a - 1)]; } },
  { id: 'sub3', op: 'sub', name: 'Restas hasta 20', target: 6, gen: () => {
    if (chance(0.7)) { const a = rnd(11, 18); return [a, rnd((a % 10) + 1, 9)]; }
    let a; do { a = rnd(12, 19); } while (a % 10 === 0); return [a, rnd(1, a % 10)];
  } },
  { id: 'sub4', op: 'sub', name: 'Dos cifras menos una', target: 7, gen: () => {
    let a; do { a = rnd(21, 99); } while (a % 10 === 0); return [a, rnd(1, a % 10)];
  } },
  { id: 'sub5', op: 'sub', name: 'Dos cifras sin pedir', target: 9, gen: () => {
    const t1 = rnd(2, 9), t2 = rnd(1, t1 - 1), u1 = rnd(0, 9), u2 = rnd(0, u1);
    return [t1 * 10 + u1, t2 * 10 + u2];
  } },
  { id: 'sub6', op: 'sub', name: 'Pidiendo prestado', target: 12, gen: () => {
    const t1 = rnd(2, 9), t2 = rnd(1, t1 - 1), u1 = rnd(0, 8), u2 = rnd(u1 + 1, 9);
    return [t1 * 10 + u1, t2 * 10 + u2];
  } },
  { id: 'sub7', op: 'sub', name: 'Tres cifras', target: 16, gen: () => { const a = rnd(200, 999); return [a, rnd(100, a - 1)]; } },
  // Multiplicaciones
  { id: 'mul1', op: 'mul', name: 'Tablas del 1, 2 y 10', target: 4, tables: [1, 2, 10] },
  { id: 'mul2', op: 'mul', name: 'Tabla del 5', target: 4, tables: [5] },
  { id: 'mul3', op: 'mul', name: 'Tabla del 3', target: 5, tables: [3] },
  { id: 'mul4', op: 'mul', name: 'Tabla del 4', target: 5, tables: [4] },
  { id: 'mul5', op: 'mul', name: 'Tabla del 6', target: 5, tables: [6] },
  { id: 'mul6', op: 'mul', name: 'Tabla del 7', target: 5, tables: [7] },
  { id: 'mul7', op: 'mul', name: 'Tabla del 8', target: 5, tables: [8] },
  { id: 'mul8', op: 'mul', name: 'Tabla del 9', target: 5, tables: [9] },
  { id: 'mul9', op: 'mul', name: '¡Todas las tablas!', target: 4, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'mul10', op: 'mul', name: 'Grandes por una cifra', target: 14, gen: () => [rnd(11, 49), rnd(2, 9)] },
  // Divisiones
  { id: 'div1', op: 'div', name: 'Dividir por 2, 5 y 10', target: 5, divisors: [2, 5, 10] },
  { id: 'div2', op: 'div', name: 'Dividir por 3 y 4', target: 6, divisors: [3, 4] },
  { id: 'div3', op: 'div', name: 'Dividir por 6, 7, 8 y 9', target: 6, divisors: [6, 7, 8, 9] },
  { id: 'div4', op: 'div', name: '¡Todas las divisiones!', target: 6, divisors: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
];
for (const s of SKILLS) {
  if (s.tables) s.gen = tableGen(s.tables);
  if (s.divisors) s.gen = divGen(s.divisors);
}
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const skillsOf = (op) => SKILLS.filter((s) => s.op === op);
export const worldOf = (skillId) => WORLDS.find((w) => w.id === SKILL[skillId].op);
export function nextSkill(skillId) {
  const list = skillsOf(SKILL[skillId].op);
  const i = list.findIndex((s) => s.id === skillId);
  return list[i + 1] || null;
}

export function compute(op, a, b) {
  switch (op) {
    case 'add': return a + b;
    case 'sub': return a - b;
    case 'mul': return a * b;
    case 'div': return a / b;
  }
}

// Clave de "hecho" para tablas/divisiones (repaso espaciado) o null.
export function factKey(op, a, b) {
  if (op === 'mul' && a <= 10 && b <= 10) return `m${Math.min(a, b)}x${Math.max(a, b)}`;
  if (op === 'div') return `d${a}/${b}`;
  if ((op === 'add' || op === 'sub') && a <= 20 && b <= 20) return `${op === 'add' ? 'a' : 's'}${a}${op === 'add' ? '+' : '-'}${b}`;
  return null;
}

let pid = 0;
export function makeProblem(skillId, a, b, format = 'input') {
  const s = SKILL[skillId];
  const c = compute(s.op, a, b);
  const p = { id: ++pid, skill: skillId, op: s.op, a, b, c, format, answer: format === 'missing' ? b : c, factKey: factKey(s.op, a, b) };
  if (format === 'choice') p.choices = makeChoices(p);
  return p;
}

// Elige el formato según qué tan nuevo es el nivel para la nena.
export function pickFormat(stat) {
  const n = stat ? stat.attempts : 0;
  const r = rand();
  if (n < 6) return r < 0.5 ? 'choice' : 'input';
  if (n < 25) return r < 0.3 ? 'choice' : r < 0.85 ? 'input' : 'missing';
  return r < 0.15 ? 'choice' : r < 0.75 ? 'input' : 'missing';
}

export function makeChoices(p) {
  const ans = p.answer;
  const cands = new Set();
  const add = (v) => { if (Number.isInteger(v) && v >= 0 && v !== ans) cands.add(v); };
  [1, -1, 2, -2].forEach((d) => add(ans + d));
  if (ans >= 20) [10, -10].forEach((d) => add(ans + d));
  if (p.op === 'mul' && p.format !== 'missing') { add(p.c + p.a); add(p.c - p.a); add(p.c + p.b); add(p.c - p.b); add(p.a + p.b); }
  if (p.op === 'div' && p.format !== 'missing') { add(p.a - p.b); add(ans * 2); }
  const near = shuffle([...cands]).sort((x, y) => Math.abs(x - ans) - Math.abs(y - ans));
  // mezclar un poco: dos cercanos y uno "tramposo" al azar
  const chosen = new Set(near.slice(0, 2));
  const rest = shuffle(near.slice(2));
  for (const v of rest) { if (chosen.size >= 3) break; chosen.add(v); }
  let k = 3;
  while (chosen.size < 3) { add(ans + k); add(ans - k); for (const v of cands) { if (chosen.size < 3) chosen.add(v); } k++; }
  return shuffle([ans, ...[...chosen].slice(0, 3)]);
}

// ---------- Estado por nivel ----------
export function newSkillState() {
  return { unlocked: false, stars: 0, attempts: 0, correct: 0, recent: [], mastery: 0, crowned: false, lessons: 0, placed: false };
}
export function skillState(state, id) {
  if (!state.skills[id]) state.skills[id] = newSkillState();
  return state.skills[id];
}
export function initSkills(state) {
  for (const w of WORLDS) skillState(state, skillsOf(w.id)[0].id).unlocked = true;
}

const median = (xs) => {
  if (!xs.length) return Infinity;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Dominio 0..100: 70% precisión reciente + 30% velocidad respecto del objetivo.
export function computeMastery(stat, skill) {
  const recent = stat.recent.slice(-12);
  if (!recent.length) return 0;
  const acc = recent.filter((r) => r.ok).length / recent.length;
  const med = median(recent.filter((r) => r.ok).map((r) => r.t));
  const speed = Number.isFinite(med) ? Math.min(1, (skill.target * 1000) / med) : 0;
  const confidence = Math.min(1, recent.length / 10);
  return Math.round(100 * (0.7 * acc + 0.3 * speed) * confidence);
}

export function speedOf(stat) {
  const med = median(stat.recent.filter((r) => r.ok).map((r) => r.t));
  return Number.isFinite(med) ? med / 1000 : null;
}

// ---------- Hechos (repaso espaciado tipo Leitner) ----------
export function factState(state, key) {
  if (!state.facts[key]) state.facts[key] = { box: 0, seen: 0, correct: 0, last: 0 };
  return state.facts[key];
}

function weightedPick(items, weightFn) {
  const ws = items.map(weightFn);
  const total = ws.reduce((x, y) => x + y, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// Para tablas y divisiones, favorece los hechos que más le cuestan.
function genWeighted(state, skill) {
  if (!skill.tables && !skill.divisors) return skill.gen();
  const pairs = [];
  for (const t of skill.tables || skill.divisors) for (let x = 1; x <= 10; x++) pairs.push([t, x]);
  const [t, x] = weightedPick(pairs, ([t, x]) => {
    const key = skill.tables ? factKey('mul', t, x) : factKey('div', t * x, t);
    const f = state.facts[key];
    if (!f) return 3;
    return [6, 4, 2.5, 1.5, 1, 0.6][Math.min(5, f.box)];
  });
  if (skill.tables) return chance(0.3) ? [x, t] : [t, x];
  return [t * x, t];
}

export function generate(state, skillId, format) {
  const skill = SKILL[skillId];
  const stat = skillState(state, skillId);
  let a, b;
  for (let i = 0; i < 6; i++) {
    [a, b] = genWeighted(state, skill);
    const key = `${a},${b}`;
    if (key !== state._lastPair) { state._lastPair = key; break; }
  }
  return makeProblem(skillId, a, b, format || pickFormat(stat));
}

export function buildLesson(state, skillId, n = 10) {
  const list = [];
  let guard = 0;
  while (list.length < n && guard++ < 200) {
    const p = generate(state, skillId);
    if (list.some((q) => q.a === p.a && q.b === p.b)) continue;
    list.push(p);
  }
  return list;
}

export function frontier(state, op) {
  const list = skillsOf(op);
  let last = list[0];
  for (const s of list) if (skillState(state, s.id).unlocked) last = s;
  return last;
}

// Práctica mágica: mezcla el nivel actual de cada mundo con repasos.
export function smartSkill(state, focusOp) {
  const cands = [];
  for (const s of SKILLS) {
    const st = skillState(state, s.id);
    if (!st.unlocked) continue;
    const isFront = frontier(state, s.op).id === s.id;
    let w = isFront ? 4 : st.mastery < 80 ? 1.5 : 0.4;
    if (focusOp && s.op === focusOp) w *= 3;
    cands.push({ s, w });
  }
  return weightedPick(cands, (c) => c.w).s.id;
}

export function buildSmart(state, n = 10, focusOp) {
  return Array.from({ length: n }, () => generate(state, smartSkill(state, focusOp)));
}

// Problemas para la carrera contrarreloj de una operación.
export function speedSkill(state, op) {
  // La carrera es para hechos rápidos: se evitan las cuentas largas si hay otras.
  const all = skillsOf(op).filter((s) => skillState(state, s.id).unlocked);
  const fast = all.filter((s) => s.target <= 6);
  const list = fast.length ? fast : all;
  const front = list[list.length - 1];
  return (chance(0.5) ? front : pick(list)).id;
}

// ---------- Registro de respuestas ----------
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function recordAnswer(state, p, ok, ms, { hinted = false } = {}) {
  const events = [];
  const skill = SKILL[p.skill];
  const st = skillState(state, p.skill);
  st.attempts++;
  if (ok) st.correct++;
  st.recent.push({ ok, t: Math.round(ms) });
  if (st.recent.length > 20) st.recent.shift();
  const before = st.mastery;
  st.mastery = computeMastery(st, skill);

  if (p.factKey) {
    const f = factState(state, p.factKey);
    f.seen++;
    f.last = Date.now();
    if (ok) {
      f.correct++;
      if (!hinted && ms < skill.target * 2000) f.box = Math.min(5, f.box + 1);
    } else {
      f.box = Math.max(0, f.box - 2);
    }
  }

  const day = todayKey();
  const d = (state.daily[day] ||= { problems: 0, correct: 0, ms: 0 });
  d.problems++;
  if (ok) d.correct++;
  d.ms += ms;
  state.totals.problems++;
  if (ok) state.totals.correct++;
  updateStreak(state, day);

  if (!st.crowned && st.mastery >= 90 && st.recent.length >= 10) {
    st.crowned = true;
    events.push({ type: 'crown', skill: p.skill });
  }
  // Auto-promoción: si domina el nivel, abre el siguiente.
  const nx = nextSkill(p.skill);
  if (nx && st.mastery >= 85 && st.recent.length >= 12 && !skillState(state, nx.id).unlocked) {
    skillState(state, nx.id).unlocked = true;
    events.push({ type: 'unlock', skill: nx.id });
  }
  if (before < st.mastery) events.push({ type: 'mastery', skill: p.skill, value: st.mastery });
  return events;
}

export function updateStreak(state, day) {
  const s = state.streak;
  if (s.lastDay === day) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  s.current = s.lastDay === todayKey(y) ? s.current + 1 : 1;
  s.best = Math.max(s.best, s.current);
  s.lastDay = day;
}

export function lessonStars(correct, total) {
  const r = correct / total;
  if (r >= 0.9) return 3;
  if (r >= 0.7) return 2;
  if (r >= 0.5) return 1;
  return 0;
}

// Cierra una lección de un nivel: estrellas y desbloqueo del siguiente.
export function finishLesson(state, skillId, correct, total) {
  const events = [];
  const st = skillState(state, skillId);
  const stars = lessonStars(correct, total);
  st.lessons++;
  if (stars > st.stars) st.stars = stars;
  const nx = nextSkill(skillId);
  if (nx && stars >= 2 && !skillState(state, nx.id).unlocked) {
    skillState(state, nx.id).unlocked = true;
    events.push({ type: 'unlock', skill: nx.id });
  }
  return { stars, events };
}

// ---------- Desafío inicial (ubicación) ----------
const LADDERS = {
  add: ['add2', 'add3', 'add6', 'add7'],
  sub: ['sub2', 'sub3', 'sub6', 'sub7'],
  mul: ['mul1', 'mul2', 'mul3', 'mul9'],
  div: ['div1', 'div4'],
};

export class Placement {
  constructor(state) {
    this.state = state;
    this.ops = ['add', 'sub', 'mul', 'div'];
    this.opIndex = 0;
    this.rung = 0;
    this.inRung = 0;
    this.okInRung = 0;
    this.passed = { add: -1, sub: -1, mul: -1, div: -1 };
    this.count = 0;
    this.done = false;
  }
  get op() { return this.ops[this.opIndex]; }
  current() {
    if (this.done) return null;
    const skillId = LADDERS[this.op][this.rung];
    let a, b;
    do { [a, b] = SKILL[skillId].gen(); } while (`${a},${b}` === this.last);
    this.last = `${a},${b}`;
    this.count++;
    return makeProblem(skillId, a, b, 'input');
  }
  answer(p, ok, ms) {
    const slow = ms > SKILL[p.skill].target * 3000;
    this.inRung++;
    if (ok && !slow) this.okInRung++;
    if (!ok || slow) return this.nextOp();
    if (this.inRung >= 2) {
      this.passed[this.op] = this.rung;
      this.rung++;
      this.inRung = 0;
      this.okInRung = 0;
      if (this.rung >= LADDERS[this.op].length) this.nextOp();
    }
  }
  nextOp() {
    this.rung = 0;
    this.inRung = 0;
    this.okInRung = 0;
    this.opIndex++;
    // Saltear operaciones que todavía no corresponden
    while (this.opIndex < this.ops.length) {
      const op = this.op;
      if (op === 'sub' && this.passed.add < 0) { this.opIndex++; continue; }
      if (op === 'div' && this.passed.mul < 1) { this.opIndex++; continue; }
      break;
    }
    if (this.opIndex >= this.ops.length) this.done = true;
  }
  // Aplica el resultado: abre los niveles aprobados y el siguiente.
  apply() {
    const result = {};
    for (const op of Object.keys(LADDERS)) {
      const r = this.passed[op];
      if (r < 0) continue;
      const top = LADDERS[op][r];
      const list = skillsOf(op);
      const idx = list.findIndex((s) => s.id === top);
      for (let i = 0; i <= Math.min(idx + 1, list.length - 1); i++) {
        const st = skillState(this.state, list[i].id);
        st.unlocked = true;
        if (i <= idx) st.placed = true;
      }
      result[op] = list[Math.min(idx + 1, list.length - 1)].id;
    }
    return result;
  }
}

// ---------- Nivel de jugadora (XP) ----------
export const xpForLevel = (lvl) => 100 + (lvl - 1) * 40;
export function levelFromXp(xp) {
  let lvl = 1;
  let rest = xp;
  while (rest >= xpForLevel(lvl)) { rest -= xpForLevel(lvl); lvl++; }
  return { level: lvl, into: rest, need: xpForLevel(lvl) };
}

export function isWorldComplete(state, op) {
  return skillsOf(op).every((s) => skillState(state, s.id).stars >= 2 || skillState(state, s.id).crowned);
}
