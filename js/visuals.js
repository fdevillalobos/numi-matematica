// Explicaciones visuales para las correcciones y las ayudas.
import { OPS } from './engine.js';

const range = (n) => Array.from({ length: n }, (_, i) => i);

// Marcos de 10 (2 filas de 5) con puntitos.
export function tenFrames(cells) {
  // cells: lista de clases ('a', 'b', 'x' o '') de longitud total de puntos
  const frames = Math.max(1, Math.ceil(cells.length / 10));
  let html = '<div class="frames">';
  for (let f = 0; f < frames; f++) {
    html += '<div class="frame">';
    for (let i = 0; i < 10; i++) {
      const k = cells[f * 10 + i];
      html += `<span class="cell">${k !== undefined ? `<i class="dot dot-${k}" style="--d:${(f * 10 + i) * 35}ms"></i>` : ''}</span>`;
    }
    html += '</div>';
  }
  return html + '</div>';
}

function addFrames(a, b) { return tenFrames([...range(a).map(() => 'a'), ...range(b).map(() => 'b')]); }
function subFrames(a, b) { return tenFrames(range(a).map((i) => (i >= a - b ? 'x' : 'a'))); }

// Arreglo de filas x columnas para multiplicar.
export function dotArray(rows, cols, { counts = true, showAll = true } = {}) {
  const size = Math.max(14, Math.min(34, Math.floor(300 / Math.max(rows, cols))));
  let html = `<div class="array" style="--s:${size}px">`;
  for (let r = 0; r < rows; r++) {
    html += `<div class="array-row" style="--d:${r * 120}ms"><div class="array-dots">`;
    for (let c = 0; c < cols; c++) html += '<i class="dot dot-a"></i>';
    html += '</div>';
    if (counts) html += `<b class="array-count">${showAll || r === 0 ? (r + 1) * cols : '?'}</b>`;
    html += '</div>';
  }
  return html + '</div>';
}

function groupsView(total, groups) {
  const per = total / groups;
  let html = '<div class="groups">';
  for (let g = 0; g < groups; g++) {
    html += `<div class="group" style="--d:${g * 110}ms">`;
    for (let i = 0; i < per; i++) html += '<i class="dot dot-b"></i>';
    html += '</div>';
  }
  return html + '</div>';
}

// Cuenta en columna con "me llevo" / "pido prestado".
function columnSteps(a, b, op) {
  const A = String(a).split('').reverse().map(Number);
  const B = String(b).split('').reverse().map(Number);
  const n = Math.max(A.length, B.length);
  const names = ['unidades', 'decenas', 'centenas', 'miles'];
  const res = [];
  const marks = []; // carry o préstamo sobre cada columna
  const steps = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const da = A[i] || 0;
    const db = B[i] || 0;
    if (op === 'add') {
      const s = da + db + carry;
      const txt = carry ? `${da} + ${db} + 1 que me llevé = ${s}` : `${da} + ${db} = ${s}`;
      res[i] = s % 10;
      if (carry) marks[i] = '1';
      steps.push(`<b>${cap(names[i])}:</b> ${txt}${s >= 10 ? ` → escribo ${s % 10} y me llevo 1` : ''}`);
      carry = s >= 10 ? 1 : 0;
    } else {
      let top = da - carry;
      let txt = '';
      if (carry && top >= 0) txt = `(le presté 1, así que el ${da} ahora es ${top}) `;
      if (top < 0) {
        txt = `el 0 no tiene para prestar: pide 1 a las ${names[i + 1]}, se vuelve 10, y como prestó 1 queda 9 → 9 − ${db} = ${9 - db}`;
        marks[i] = '9';
        res[i] = 9 - db;
        carry = 1;
      } else if (top < db) {
        txt += `${top} no alcanza para sacar ${db}: pido 1 a las ${names[i + 1]} → ${top + 10} − ${db} = ${top + 10 - db}`;
        marks[i] = String(top + 10);
        res[i] = top + 10 - db;
        carry = 1;
      } else {
        txt += `${top} − ${db} = ${top - db}`;
        res[i] = top - db;
        carry = 0;
      }
      steps.push(`<b>${cap(names[i])}:</b> ${txt}`);
    }
  }
  if (op === 'add' && carry) { res[n] = 1; marks[n] = '1'; }
  return { A, B, res, marks, steps, n: Math.max(n, res.length) };
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function columnView(a, b, op, { showResult = true } = {}) {
  const { A, B, res, marks, steps, n } = columnSteps(a, b, op);
  // quitar ceros a la izquierda del resultado
  let top = res.length - 1;
  while (top > 0 && res[top] === 0) top--;
  const cols = n + 1;
  const cell = (v, cls = '') => `<span class="col-cell ${cls}">${v ?? ''}</span>`;
  let html = `<div class="column" style="--cols:${cols}">`;
  html += cell('');
  for (let i = n - 1; i >= 0; i--) html += cell(showResult ? marks[i] : '', 'col-mark');
  html += cell('');
  for (let i = n - 1; i >= 0; i--) html += cell(A[i]);
  html += cell(OPS[op].sym, 'col-op');
  for (let i = n - 1; i >= 0; i--) html += cell(B[i]);
  html += `<span class="col-line" style="grid-column: 1 / span ${cols}"></span>`;
  html += cell('');
  for (let i = n - 1; i >= 0; i--) html += cell(showResult && i <= top ? res[i] : '', 'col-res');
  html += '</div>';
  return { html, steps };
}

const TABLE_TIPS = {
  1: 'Cualquier número por 1 da el mismo número.',
  2: 'Por 2 es el doble: sumás el número dos veces.',
  3: 'Contá de 3 en 3: 3, 6, 9, 12…',
  4: 'Por 4 es el doble del doble.',
  5: 'La tabla del 5 siempre termina en 0 o en 5.',
  6: 'Por 6 es lo mismo que por 5, y le sumás una vez más.',
  7: 'La del 7 es difícil: ¡dala vuelta si te ayuda! 7 × 3 = 3 × 7.',
  8: 'Por 8 es el doble, del doble, del doble.',
  9: 'Truco del 9: multiplicá por 10 y restá una vez el número.',
  10: 'Por 10: le agregás un 0 al final.',
};

function mulTip(a, b) {
  const t = [a, b].includes(9) ? 9 : [a, b].includes(10) ? 10 : [a, b].includes(5) ? 5 : Math.max(a, b) <= 10 ? Math.min(a, b) : null;
  if (t === 9) { const n = a === 9 ? b : a; return `Truco del 9: 10 × ${n} = ${10 * n}, menos ${n} = ${9 * n}.`; }
  if (t === 2) { const n = a === 2 ? b : a; return `Por 2 es el doble: ${n} + ${n} = ${2 * n}.`; }
  return TABLE_TIPS[t] || 'Podés dar vuelta la cuenta: el resultado es el mismo.';
}

const isSmall = (p) => p.a <= 20 && p.b <= 20 && p.c <= 20;

function questionLine(p, reveal) {
  const s = OPS[p.op].sym;
  const ans = `<span class="ans">${p.answer}</span>`;
  if (p.format === 'missing') return `${p.a} ${s} ${reveal ? ans : '?'} = ${p.c}`;
  return `${p.a} ${s} ${p.b} = ${reveal ? ans : '?'}`;
}

// Explicación completa (cuando se equivoca).
export function explain(p) {
  let visual = '';
  let text = [];
  const { a, b, c } = p;
  if (p.op === 'add') {
    if (isSmall(p) && a <= 10 && b <= 10) {
      visual = addFrames(a, b);
      if (c > 10) text.push(`Completá el 10: ${a} + ${10 - a} = 10, y te quedan ${b - (10 - a)} más → 10 + ${b - (10 - a)} = ${c}.`);
      else text.push(`Juntá ${a} y ${b} puntitos: son ${c}.`);
    } else {
      const col = columnView(a, b, 'add');
      visual = col.html;
      text = col.steps;
    }
  } else if (p.op === 'sub') {
    if (a <= 20) {
      visual = subFrames(a, b);
      text.push(`Tenés ${a}, tachás ${b} y quedan ${c}.`);
      if (a > 10 && b > a - 10) text.push(`Truco: ${a} − ${a - 10} = 10, y 10 − ${b - (a - 10)} = ${c}.`);
    } else {
      const col = columnView(a, b, 'sub');
      visual = col.html;
      text = col.steps;
    }
    text.push(`Comprobá: ${c} + ${b} = ${a} ✔︎`);
  } else if (p.op === 'mul') {
    if (a <= 10 && b <= 10) {
      visual = dotArray(a, b);
      text.push(`${a} × ${b} son ${a} filas de ${b}: ${range(a).map((i) => (i + 1) * b).join(', ')}.`);
      text.push(mulTip(a, b));
    } else {
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      const t = Math.floor(big / 10) * 10;
      const u = big % 10;
      visual = `<div class="split">
        <div class="split-part"><b>${t} × ${small}</b><span>= ${t * small}</span></div>
        <div class="split-plus">+</div>
        <div class="split-part"><b>${u} × ${small}</b><span>= ${u * small}</span></div>
        <div class="split-plus">=</div>
        <div class="split-part total"><b>${c}</b></div></div>`;
      text.push(`Separá ${big} en ${t} + ${u}. Multiplicá cada parte por ${small} y sumá: ${t * small} + ${u * small} = ${c}.`);
    }
  } else if (p.op === 'div') {
    visual = groupsView(a, b);
    text.push(`Repartí ${a} en ${b} grupos iguales: cada grupo tiene ${c}.`);
    text.push(`Porque ${b} × ${c} = ${a}.`);
  }
  if (p.format === 'missing') {
    const inv = { add: `${c} − ${a} = ${b}`, sub: `${a} − ${c} = ${b}`, mul: `${c} ÷ ${a} = ${b}`, div: `${a} ÷ ${c} = ${b}` }[p.op];
    text.unshift(`El número que falta es ${b}, porque ${inv}.`);
  }
  return {
    html: `<div class="explain-q">${questionLine(p, true)}</div><div class="explain-visual">${visual}</div>
      <ul class="explain-steps">${text.map((t) => `<li>${t}</li>`).join('')}</ul>`,
    speech: `La respuesta es ${p.answer}. ${text[0]?.replace(/<[^>]+>/g, '').replace(/−/g, 'menos').replace(/×/g, 'por').replace(/÷/g, 'dividido') || ''}`,
  };
}

// Ayuda sin decir la respuesta.
export function hint(p) {
  const { a, b, c } = p;
  let visual = '';
  let text = '';
  if (p.format === 'missing') {
    text = {
      add: `¿Cuánto le falta a ${a} para llegar a ${c}? Podés contar desde ${a}.`,
      sub: `¿Cuánto hay que sacarle a ${a} para que quede ${c}?`,
      mul: `¿Cuántas veces ${a} necesitás para llegar a ${c}? Contá de ${a} en ${a}.`,
      div: `¿En cuántos grupos repartís ${a} para que cada uno tenga ${c}?`,
    }[p.op];
  }
  if (p.op === 'add') {
    if (isSmall(p) && a <= 10 && b <= 10) { visual = addFrames(a, b); text ||= 'Contá todos los puntitos. ¡Llená primero el 10!'; }
    else { visual = columnView(a, b, 'add', { showResult: false }).html; text ||= 'Empezá por las unidades (la derecha). Si pasás de 9, ¡te llevás 1!'; }
  } else if (p.op === 'sub') {
    if (a <= 20) { visual = subFrames(a, b); text ||= 'Contá los puntitos que no están tachados.'; }
    else { visual = columnView(a, b, 'sub', { showResult: false }).html; text ||= 'Empezá por las unidades. Si arriba hay menos, pedí 1 prestado.'; }
  } else if (p.op === 'mul') {
    if (a <= 10 && b <= 10) { visual = dotArray(a, b, { showAll: false }); text ||= `Contá de ${b} en ${b}, ${a} veces. ${mulTip(a, b)}`; }
    else { const big = Math.max(a, b), small = Math.min(a, b); text ||= `Separá ${big} en ${Math.floor(big / 10) * 10} + ${big % 10} y multiplicá cada parte por ${small}.`; }
  } else if (p.op === 'div') {
    text ||= `Pensá: ¿qué número por ${b} da ${a}? Contá de ${b} en ${b} hasta llegar a ${a}.`;
    visual = `<div class="skip">${range(Math.min(10, c + 2)).map((i) => `<span>${(i + 1) * b}</span>`).join('')}</div>`;
  }
  return `<div class="explain-q">${questionLine(p, false)}</div><div class="explain-visual">${visual}</div><p class="hint-text">💡 ${text}</p>`;
}

export function speakProblem(p) {
  const w = OPS[p.op].word;
  if (p.format === 'missing') return `${p.a} ${w} cuánto, es igual a ${p.c}`;
  return `${p.a} ${w}${p.op === 'div' ? ' por' : ''} ${p.b}`;
}
