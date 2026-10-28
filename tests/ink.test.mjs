import test from 'node:test';
import assert from 'node:assert/strict';
import { recognize, recognizeDigit } from '../js/ink.js';

// Trazos "a mano" sintéticos: dígitos dibujados con inclinación, estiramiento y temblor.
const rad = (d) => (d * Math.PI) / 180;
const arc = (cx, cy, rx, ry, a0, a1, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const a = rad(a0 + ((a1 - a0) * i) / n); return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
const line = (x0, y0, x1, y1, n = 12) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
const quad = (x0, y0, cx, cy, x1, y1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return { x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1 }; });

const HAND = {
  0: () => [arc(0.5, 0.5, 0.3, 0.48, -80, 285)],
  1: () => [line(0.52, 0.02, 0.47, 1)],
  2: () => [[...arc(0.5, 0.28, 0.35, 0.27, 185, 370), ...quad(0.85, 0.35, 0.55, 0.75, 0.1, 0.98), ...line(0.1, 0.98, 0.9, 0.96)]],
  3: () => [[...arc(0.5, 0.27, 0.33, 0.25, 205, 440), ...arc(0.5, 0.74, 0.38, 0.25, 265, 515)]],
  4: () => [[...line(0.62, 0.02, 0.08, 0.62), ...line(0.08, 0.62, 0.92, 0.64)], line(0.68, 0.3, 0.66, 1)],
  5: () => [[...line(0.28, 0.02, 0.24, 0.43), ...arc(0.47, 0.7, 0.37, 0.29, 225, 495)], line(0.27, 0.02, 0.85, 0.03)],
  6: () => [[...quad(0.72, 0.02, 0.18, 0.3, 0.22, 0.72), ...arc(0.5, 0.72, 0.28, 0.27, 180, 535)]],
  7: () => [[...line(0.05, 0.03, 0.95, 0.02), ...line(0.95, 0.02, 0.4, 1)]],
  8: () => [[...arc(0.5, 0.26, 0.27, 0.24, 90, 450), ...arc(0.5, 0.74, 0.33, 0.25, -90, 270)]],
  9: () => [[...arc(0.47, 0.28, 0.3, 0.26, 0, 360), ...line(0.77, 0.28, 0.73, 1)]],
};

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function distort(strokes, ox = 0) {
  const slant = (rnd() - 0.5) * 0.35, sx = 0.75 + rnd() * 0.5, sc = 120 + rnd() * 80;
  return strokes.map((s) => s.map((p) => ({ x: ox + (p.x * sx + p.y * slant) * sc + (rnd() - 0.5) * 6, y: p.y * sc + (rnd() - 0.5) * 6 })));
}

test('reconoce dígitos sueltos con letra variada', () => {
  let ok = 0, total = 0;
  const misses = [];
  for (let k = 0; k < 20; k++) {
    for (const d of Object.keys(HAND)) {
      const r = recognizeDigit(distort(HAND[d]()));
      total++;
      if (r.digit === d) ok++; else misses.push(`${d}->${r.digit}`);
    }
  }
  const acc = ok / total;
  console.log(`precisión ${Math.round(acc * 100)}%`, misses.slice(0, 15).join(' '));
  assert.ok(acc >= 0.9, `precisión ${acc}`);
});

test('separa y lee números de varias cifras', () => {
  let ok = 0;
  const cases = ['12', '35', '48', '56', '70', '81', '96', '24', '63', '100', '42', '27'];
  for (const n of cases) {
    const strokes = [];
    [...n].forEach((d, i) => strokes.push(...distort(HAND[d](), i * 190)));
    if (recognize(strokes).text === n) ok++; else console.log('falló', n, recognize(strokes).text);
  }
  assert.ok(ok >= cases.length - 1, `${ok}/${cases.length}`);
});
