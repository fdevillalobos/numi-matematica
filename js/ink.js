// Escritura con Apple Pencil: lienzo + reconocedor de dígitos ($P point-cloud),
// sin modelos externos. Separa números de varias cifras por columnas.

const N = 32;

// ---------- plantillas de dígitos (coordenadas 0..1, y hacia abajo) ----------
const rad = (d) => (d * Math.PI) / 180;
function arc(cx, cy, rx, ry, a0, a1, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = rad(a0 + ((a1 - a0) * i) / n);
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}
function line(x0, y0, x1, y1, n = 10) {
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
}
function quad(x0, y0, cx, cy, x1, y1, n = 14) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1 };
  });
}
const cat = (...parts) => parts.flat();

const SHAPES = {
  0: [[arc(0.5, 0.5, 0.33, 0.5, -90, 270)], [arc(0.5, 0.5, 0.42, 0.5, -90, 270)]],
  1: [[line(0.5, 0, 0.5, 1)], [cat(line(0.25, 0.25, 0.5, 0), line(0.5, 0, 0.5, 1))], [cat(line(0.25, 0.25, 0.5, 0), line(0.5, 0, 0.5, 1)), line(0.25, 1, 0.75, 1)]],
  2: [[cat(arc(0.5, 0.3, 0.38, 0.3, 190, 380), quad(0.86, 0.4, 0.6, 0.7, 0.08, 1), line(0.08, 1, 0.95, 1))],
      [cat(arc(0.5, 0.3, 0.38, 0.3, 200, 400), line(0.8, 0.5, 0.08, 1), line(0.08, 1, 0.95, 1))]],
  3: [[cat(arc(0.47, 0.26, 0.36, 0.26, 200, 450), arc(0.47, 0.75, 0.42, 0.25, 270, 520))],
      [cat(line(0.1, 0, 0.85, 0), line(0.85, 0, 0.4, 0.42), arc(0.45, 0.72, 0.42, 0.28, 270, 520))]],
  4: [[cat(line(0.68, 0, 0.05, 0.65), line(0.05, 0.65, 0.95, 0.65)), line(0.7, 0.25, 0.7, 1)],
      [cat(line(0.15, 0, 0.1, 0.6), line(0.1, 0.6, 0.95, 0.6)), line(0.72, 0, 0.72, 1)],
      [cat(line(0.7, 1, 0.7, 0), line(0.7, 0, 0.05, 0.65), line(0.05, 0.65, 0.95, 0.65))]],
  5: [[cat(line(0.25, 0, 0.2, 0.45), arc(0.45, 0.7, 0.4, 0.3, 230, 500)), line(0.25, 0, 0.88, 0)],
      [cat(line(0.88, 0, 0.25, 0), line(0.25, 0, 0.2, 0.45), arc(0.45, 0.7, 0.4, 0.3, 230, 500))]],
  6: [[cat(quad(0.75, 0, 0.15, 0.25, 0.2, 0.7), arc(0.5, 0.72, 0.3, 0.28, 180, 540))],
      [cat(quad(0.7, 0, 0.25, 0.3, 0.22, 0.75), arc(0.52, 0.74, 0.3, 0.26, 180, 520))]],
  7: [[cat(line(0, 0, 1, 0), line(1, 0, 0.35, 1))], [cat(line(0, 0, 1, 0), line(1, 0, 0.35, 1)), line(0.35, 0.5, 0.9, 0.5)],
      [cat(line(0.05, 0.15, 0.05, 0), line(0.05, 0, 1, 0), quad(1, 0, 0.55, 0.45, 0.45, 1))]],
  8: [[cat(arc(0.5, 0.25, 0.3, 0.25, 90, 450), arc(0.5, 0.74, 0.36, 0.26, -90, 270))],
      [cat(arc(0.5, 0.25, 0.3, 0.25, 0, 180), quad(0.2, 0.25, 0.3, 0.5, 0.8, 0.75), arc(0.5, 0.75, 0.3, 0.25, 0, 180), quad(0.2, 0.75, 0.3, 0.5, 0.8, 0.25))]],
  9: [[cat(arc(0.45, 0.28, 0.33, 0.28, 0, 360), line(0.78, 0.28, 0.72, 1))],
      [cat(arc(0.45, 0.28, 0.33, 0.28, 0, 360), quad(0.78, 0.28, 0.8, 0.8, 0.4, 1))],
      [arc(0.45, 0.28, 0.33, 0.28, 0, 360), line(0.78, 0.05, 0.75, 1)]],
};

// ---------- $P ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function resample(strokes) {
  const pts = [];
  strokes.forEach((s, id) => s.forEach((p) => pts.push({ x: p.x, y: p.y, id })));
  let len = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) len += dist(pts[i - 1], pts[i]);
  const I = len / (N - 1) || 1;
  const out = [pts[0]];
  let D = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].id !== pts[i - 1].id) continue;
    const d = dist(pts[i - 1], pts[i]);
    if (D + d >= I && d > 0) {
      const t = (I - D) / d;
      const q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y), id: pts[i].id };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < N) out.push({ ...pts[pts.length - 1] });
  return out.slice(0, N);
}

function normalize(strokes) {
  let pts = resample(strokes);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  pts = pts.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, id: p.id }));
  const cx = pts.reduce((a, p) => a + p.x, 0) / N, cy = pts.reduce((a, p) => a + p.y, 0) / N;
  return pts.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
}

function cloudDistance(a, b, start) {
  const matched = new Array(N).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity, idx = -1;
    for (let j = 0; j < N; j++) {
      if (matched[j]) continue;
      const d = dist(a[i], b[j]);
      if (d < min) { min = d; idx = j; }
    }
    matched[idx] = true;
    sum += (1 - ((i - start + N) % N) / N) * min;
    i = (i + 1) % N;
  } while (i !== start);
  return sum;
}

function greedyMatch(a, b) {
  const step = Math.floor(Math.pow(N, 0.5));
  let min = Infinity;
  for (let i = 0; i < N; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

const TEMPLATES = [];
for (const [digit, variants] of Object.entries(SHAPES)) for (const strokes of variants) TEMPLATES.push({ digit, pts: normalize(strokes) });

// Plantillas propias de la nena (se guardan para aprender su letra).
let personal = [];
export function setPersonalTemplates(list) {
  personal = (list || []).map((t) => ({ digit: t.digit, pts: normalize(t.strokes), mine: true }));
}

export function recognizeDigit(strokes) {
  const box = bbox(strokes.flat());
  // Un palito finito es un 1
  if (strokes.length <= 2 && box.w < box.h * 0.28) return { digit: '1', score: 0 };
  const pts = normalize(strokes);
  let best = null;
  for (const t of personal.concat(TEMPLATES)) {
    const d = greedyMatch(pts, t.pts) * (t.mine ? 0.92 : 1);
    if (!best || d < best.score) best = { digit: t.digit, score: d };
  }
  // El 8 cruza por el medio; el 0 no.
  if (best && (best.digit === '8' || best.digit === '0')) {
    const center = pts.filter((p) => Math.hypot(p.x, p.y) < 0.12).length;
    best.digit = center >= 1 ? '8' : '0';
  }
  return best;
}

function bbox(pts) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}

// Agrupa trazos en cifras según se superponen horizontalmente.
export function segment(strokes) {
  const items = strokes.filter((s) => s.length > 1).map((s) => ({ s, b: bbox(s) })).sort((a, b) => a.b.x0 - b.b.x0);
  const groups = [];
  for (const it of items) {
    const g = groups[groups.length - 1];
    if (g) {
      const overlap = Math.min(g.b.x1, it.b.x1) - Math.max(g.b.x0, it.b.x0);
      const narrow = Math.min(g.b.w, it.b.w) || 1;
      if (overlap > narrow * 0.35 || (it.b.x0 + it.b.x1) / 2 < g.b.x1 - g.b.w * 0.1) {
        g.strokes.push(it.s);
        g.b = { x0: Math.min(g.b.x0, it.b.x0), x1: Math.max(g.b.x1, it.b.x1), w: 0 };
        g.b.w = g.b.x1 - g.b.x0;
        continue;
      }
    }
    groups.push({ strokes: [it.s], b: { ...it.b } });
  }
  return groups;
}

export function recognize(strokes) {
  const groups = segment(strokes);
  return { text: groups.map((g) => recognizeDigit(g.strokes)?.digit ?? '').join(''), groups };
}

// ---------- lienzo ----------
export function inkPad(container, { onChange }) {
  container.innerHTML = `<div class="ink-pad"><canvas></canvas><span class="ink-hint">✏️ Escribí la respuesta acá</span></div>`;
  const pad = container.querySelector('.ink-pad');
  const canvas = pad.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let strokes = [];
  let cur = null;
  let penSeen = false;
  let timer;

  function size() {
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2B2150';
    ctx.lineWidth = 12;
    for (const s of strokes.concat(cur ? [cur] : [])) {
      ctx.beginPath();
      s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y);
      ctx.stroke();
    }
  }
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'pen') penSeen = true;
    else if (e.pointerType === 'touch' && (penSeen || e.width > 40 || cur)) return; // ignorar la palma
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    pad.classList.add('used');
    clearTimeout(timer);
    cur = [pos(e)];
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!cur) return;
    let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!evs.length) evs = [e];
    for (const ev of evs) cur.push(pos(ev));
    redraw();
  });
  const end = () => {
    if (!cur) return;
    strokes.push(cur);
    cur = null;
    redraw();
    clearTimeout(timer);
    timer = setTimeout(() => onChange(recognize(strokes).text), 220);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.style.touchAction = 'none';
  requestAnimationFrame(size);
  addEventListener('resize', size);

  return {
    clear() { strokes = []; cur = null; pad.classList.remove('used'); redraw(); onChange(''); },
    undo() { strokes.pop(); redraw(); onChange(strokes.length ? recognize(strokes).text : ''); },
    strokes: () => strokes,
    destroy() { removeEventListener('resize', size); },
  };
}
