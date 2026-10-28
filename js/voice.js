// Voz grabada de Numi: parte cada frase en clips (números y pedacitos de texto)
// para armarla con audios pregenerados. Módulo puro: lo usan sound.js y tools/voz/corpus.mjs.

const PAUSE = { '.': 0.3, '!': 0.3, '?': 0.3, ',': 0.14, ':': 0.18, ';': 0.18 };
const GAP = 0.03; // entre un pedacito y el siguiente dentro de la misma frase

// Lo que se va a decir, sin HTML, emojis ni símbolos matemáticos.
export function clean(text) {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/−/g, ' menos ').replace(/×/g, ' por ').replace(/÷/g, ' dividido ')
    .replace(/\+/g, ' más ').replace(/=/g, ' es ').replace(/→/g, ', ')
    .replace(/[()]/g, ',')
    .replace(/[^\p{L}\p{N}\s.,:;¡!¿?]/gu, ' ')
    .replace(/\s+([.,:;!?])/g, '$1')
    .replace(/([.,:;!?])[,]+/g, '$1 ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
}

export const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Clave del clip con la frase entera (suena más natural que armarla por partes).
export function fullKey(text) {
  const s = slug(clean(text));
  return `f-${s.length > 80 ? `${s.slice(0, 60)}-${hash(s)}` : s}`;
}

const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

// Número en palabras (los modelos de voz leen mejor "doce" que "12").
export function words(n) {
  if (n < 30) return UNITS[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` y ${UNITS[n % 10]}` : '');
  if (n === 100) return 'cien';
  if (n < 1000) return HUNDREDS[Math.floor(n / 100)] + (n % 100 ? ` ${words(n % 100)}` : '');
  if (n < 1e6) {
    const k = Math.floor(n / 1000);
    return (k === 1 ? 'mil' : `${words(k).replace(/uno$/, 'un')} mil`) + (n % 1000 ? ` ${words(n % 1000)}` : '');
  }
  return String(n);
}

// Texto para grabar una frase entera, con los números en palabras.
export const spoken = (text) => clean(text).replace(/\d+/g, (d) => words(Number(d)));

// Frase -> clips en orden: [{ key, text, pause }]. `text` es lo que hay que grabar para esa clave.
export function segments(text) {
  const out = [];
  for (const piece of clean(text).match(/[^.,:;!?]+[.,:;!?]*/g) || []) {
    const [, , body, tail] = piece.match(/^\s*([¡¿]?)(.*?)([.,:;!?]*)\s*$/);
    const parts = body.split(/(\d+)/).map((t) => t.trim()).filter(Boolean);
    const end = tail.slice(-1);
    parts.forEach((t, i) => {
      const pause = i === parts.length - 1 ? (PAUSE[end] ?? GAP) : GAP;
      if (/^\d+$/.test(t)) { out.push({ key: String(Number(t)), text: words(Number(t)), pause }); return; }
      const s = slug(t.replace(/[¡¿]/g, ''));
      if (!s) return;
      // Una frase entera con ¡! o ¿? se graba aparte, con su entonación.
      const mark = parts.length === 1 ? (end === '!' ? 'x' : end === '?' ? 'q' : '') : '';
      const say = mark === 'x' ? `¡${t.replace(/[¡]/g, '')}!` : mark === 'q' ? `¿${t.replace(/[¿]/g, '')}?` : t;
      out.push({ key: mark ? `${s}-${mark}` : s, text: say, pause });
    });
  }
  return out;
}
