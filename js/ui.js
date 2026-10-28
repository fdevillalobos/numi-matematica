import { sfx } from './sound.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Lo que tiene puesto Numi (se compra con estrellas).
let outfit = {};
export function setOutfit(o) { outfit = o || {}; }
const SLOT_POS = {
  head: '<text x="100" y="46" font-size="66" text-anchor="middle">$</text>',
  face: '<text x="100" y="122" font-size="78" text-anchor="middle">$</text>',
  hand: '<text x="178" y="150" font-size="52" text-anchor="middle" class="m-held">$</text>',
};
function outfitSvg() {
  return Object.entries(outfit).filter(([, e]) => e).map(([slot, e]) => SLOT_POS[slot]?.replace('$', e) || '').join('');
}

// Numi, la mascota.
export function mascot(mood = 'happy', size = 160, extra = '') {
  const eyes = mood === 'party'
    ? `<path d="M62 100 q13 -16 26 0" class="m-line"/><path d="M112 100 q13 -16 26 0" class="m-line"/>`
    : `<g class="m-eyes"><circle cx="75" cy="100" r="18" fill="#fff"/><circle cx="125" cy="100" r="18" fill="#fff"/>
       <circle cx="${mood === 'think' ? 81 : 77}" cy="${mood === 'think' ? 94 : 102}" r="10" fill="#2B2150"/>
       <circle cx="${mood === 'think' ? 131 : 127}" cy="${mood === 'think' ? 94 : 102}" r="10" fill="#2B2150"/>
       <circle cx="${mood === 'think' ? 84 : 80}" cy="${mood === 'think' ? 90 : 98}" r="3.5" fill="#fff"/>
       <circle cx="${mood === 'think' ? 134 : 130}" cy="${mood === 'think' ? 90 : 98}" r="3.5" fill="#fff"/></g>`;
  const mouth = {
    happy: '<path d="M80 128 q20 22 40 0" class="m-line" fill="#7A2E5C"/>',
    party: '<path d="M76 124 q24 34 48 0 z" fill="#7A2E5C"/><path d="M88 136 q12 8 24 0" fill="#FF7AA8"/>',
    wow: '<ellipse cx="100" cy="134" rx="10" ry="13" fill="#7A2E5C"/>',
    think: '<path d="M88 134 q12 -4 26 2" class="m-line"/>',
    sad: '<path d="M84 138 q16 -14 32 0" class="m-line"/>',
  }[mood] || '';
  const arms = mood === 'party'
    ? '<ellipse cx="30" cy="78" rx="13" ry="22" transform="rotate(-35 30 78)" class="m-arm"/><ellipse cx="170" cy="78" rx="13" ry="22" transform="rotate(35 170 78)" class="m-arm"/>'
    : '<ellipse cx="30" cy="128" rx="13" ry="20" transform="rotate(25 30 128)" class="m-arm"/><ellipse cx="170" cy="128" rx="13" ry="20" transform="rotate(-25 170 128)" class="m-arm"/>';
  return `<svg class="mascot mascot-${mood} ${extra}" width="${size}" height="${size}" viewBox="0 0 200 210" aria-hidden="true">
    <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B794FF"/><stop offset="1" stop-color="#7C4DFF"/></linearGradient></defs>
    <ellipse cx="100" cy="196" rx="58" ry="9" fill="rgba(40,20,90,.15)"/>
    <g class="m-body">
      ${outfit.head ? '' : `<path d="M78 48 L62 14" class="m-ant"/><path d="M122 48 L138 14" class="m-ant"/>
      <path d="M62 2 l3.5 7.5 8 1 -6 5.5 1.6 8 -7.1-4 -7.1 4 1.6-8 -6-5.5 8-1z" fill="#FFC93C" class="m-star"/>
      <path d="M138 2 l3.5 7.5 8 1 -6 5.5 1.6 8 -7.1-4 -7.1 4 1.6-8 -6-5.5 8-1z" fill="#FFC93C" class="m-star"/>`}
      ${arms}
      <ellipse cx="100" cy="115" rx="76" ry="72" fill="url(#mg)"/>
      <ellipse cx="100" cy="150" rx="42" ry="28" fill="#fff" opacity=".22"/>
      <ellipse cx="52" cy="128" rx="11" ry="7" fill="#FF8FB8" opacity=".8"/>
      <ellipse cx="148" cy="128" rx="11" ry="7" fill="#FF8FB8" opacity=".8"/>
      ${eyes}${mouth}${outfitSvg()}
    </g></svg>`;
}

export function bubble(text, cls = '') {
  return `<div class="bubble ${cls}">${text}</div>`;
}

let toastTimer;
export function toast(html, { kind = 'info', ms = 2600 } = {}) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.className = `toast toast-${kind} show`;
  el.innerHTML = html;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function modal(html, { cls = '', onClose, dismissable = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${cls}">${dismissable ? '<button class="modal-x" data-close aria-label="Cerrar">✕</button>' : ''}${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 250);
    onClose?.();
  };
  wrap.addEventListener('click', (e) => {
    if ((dismissable && e.target === wrap) || e.target.closest('[data-close]')) { sfx('tap'); close(); }
  });
  return { el: wrap, close };
}

export function progressRing(pct, size = 64, stroke = 8, color = '#FFB703', inner = '') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(0,0,0,.08)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
    <div class="ring-inner">${inner}</div></div>`;
}

export const starsHtml = (n, max = 3) => Array.from({ length: max }, (_, i) => `<span class="st ${i < n ? 'on' : ''}">★</span>`).join('');
