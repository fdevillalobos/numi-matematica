// Junta todo lo que puede decir Numi y lo convierte en la lista de clips a grabar.
// Uso: node tools/voz/corpus.mjs  -> escribe tools/voz/frases.json
//
// Si agregás un say() nuevo en la app, sumá la frase acá (o en extra.txt).
// En el navegador, numiVoz.faltantes() lista lo que se dijo sin clip grabado.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SKILLS, makeProblem, setRandom } from '../../js/engine.js';
import { explain, speakProblem } from '../../js/visuals.js';
import { PRAISE, COMBO_PRAISE, OUTFITS, STICKERS } from '../../js/data.js';
import { BOSSES } from '../../js/game.js';
import { segments, fullKey, spoken } from '../../js/voice.js';

const dir = new URL('.', import.meta.url);
const lines = (f) => (existsSync(new URL(f, dir)) ? readFileSync(new URL(f, dir), 'utf8').split('\n') : [])
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const names = ['', ...lines('nombres.txt')];
const noBang = (t) => t.replace(/[¡!]/g, '');

// Frases enteras: se graban completas (además de por partes) porque suenan mejor.
const full = new Set([
  ...PRAISE.map(noBang), ...COMBO_PRAISE.map(noBang), // game.js: racha cada 5
  '¡Nuevo récord!', '¡Gracias! Ahora conozco tu letra',
  ...Object.values(BOSSES).map(([, n]) => `¡Le ganaste al ${n}!`),
  ...OUTFITS.map((o) => `¡${o.name}!`), ...STICKERS.map((s) => `¡${s.name}!`),
  ...names.map((n) => `¡Hola ${n}! ¡Qué lindo conocerte!`),
  ...names.map((n) => `¡Hola ${n}! Soy Numi. ¿Practicamos las tablas?`),
  ...lines('extra.txt'),
]);
for (let l = 1; l <= 60; l++) full.add(`¡Subiste al nivel ${l}!`);
for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) full.add(`${a} por ${b}, ${a * b}`);

// Frases que sólo se arman por partes (números grandes o combinaciones infinitas).
const parts = new Set();
for (const t of ['¡Perfecto!', '¡Muy bien!', '¡Bien hecho!', '¡Buen intento!']) parts.add(`${noBang(t)} 7 de 10`);
parts.add('¡Nuevo récord! 25');

// Problemas: muestreo con semilla fija para cubrir todas las ramas de las explicaciones.
let seed = 42;
setRandom(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32));
const SMALL = /^(add[123]|sub[123]|mul[1-9]|div\d)$/;
for (const s of SKILLS) {
  for (let i = 0; i < 3000; i++) {
    const [a, b] = s.gen();
    for (const format of ['input', 'missing']) {
      const p = makeProblem(s.id, a, b, format);
      const into = SMALL.test(s.id) ? full : parts;
      into.add(speakProblem(p));
      into.add(explain(p).speech);
    }
  }
}

const clips = new Map();
for (const t of [...full, ...parts]) for (const s of segments(t)) clips.set(s.key, s.text);
for (let n = 0; n <= 1000; n++) for (const s of segments(String(n))) clips.set(s.key, s.text);
const nParts = clips.size;
for (const t of full) if (segments(t).length > 1) clips.set(fullKey(t), spoken(t));

const out = [...clips].map(([key, text]) => ({ key, text }));
writeFileSync(new URL('frases.json', dir), `${JSON.stringify(out, null, 1)}\n`);
console.log(`${out.length} clips: ${nParts} pedacitos + ${out.length - nParts} frases enteras -> tools/voz/frases.json`);
