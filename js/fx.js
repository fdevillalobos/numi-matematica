// Efectos: confeti en canvas y estrellas que vuelan al contador.
const COLORS = ['#FF5D8F', '#FFB703', '#8B5CF6', '#2EC27E', '#3B9EFF', '#FF8A3D', '#F472B6'];
let canvas, cx, parts = [], running = false;

function ensure() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  document.body.appendChild(canvas);
  cx = canvas.getContext('2d');
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}

export function confetti({ x = innerWidth / 2, y = innerHeight / 2, count = 80, spread = 1, shapes = ['rect', 'circle', 'star'] } = {}) {
  ensure();
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = (4 + Math.random() * 9) * spread;
    parts.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 6,
      r: 5 + Math.random() * 7,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: shapes[(Math.random() * shapes.length) | 0],
      life: 0,
      max: 70 + Math.random() * 50,
    });
  }
  if (!running) { running = true; requestAnimationFrame(step); }
}

export function bigCelebration() {
  confetti({ x: innerWidth * 0.2, y: innerHeight * 0.6, count: 90 });
  setTimeout(() => confetti({ x: innerWidth * 0.8, y: innerHeight * 0.6, count: 90 }), 150);
  setTimeout(() => confetti({ x: innerWidth * 0.5, y: innerHeight * 0.35, count: 120, spread: 1.3 }), 300);
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function step() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life < p.max && p.y < innerHeight + 40);
  for (const p of parts) {
    p.life++;
    p.vy += 0.32;
    p.vx *= 0.985;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    cx.save();
    cx.globalAlpha = Math.max(0, 1 - p.life / p.max);
    cx.translate(p.x, p.y);
    cx.rotate(p.rot);
    cx.fillStyle = p.color;
    if (p.shape === 'rect') cx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.6);
    else if (p.shape === 'circle') { cx.beginPath(); cx.arc(0, 0, p.r / 2, 0, 7); cx.fill(); }
    else star(cx, p.r * 0.7);
    cx.restore();
  }
  if (parts.length) requestAnimationFrame(step);
  else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
}

// Una estrellita que vuela desde un punto hasta el contador de estrellas.
export function flyStar(fromEl, toSelector = '.js-stars', text = '⭐') {
  const to = document.querySelector(toSelector);
  if (!fromEl || !to) return;
  const a = fromEl.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly-star';
  el.textContent = text;
  el.style.left = `${a.left + a.width / 2}px`;
  el.style.top = `${a.top + a.height / 2}px`;
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`, opacity: 1 },
    ],
    { duration: 800, easing: 'cubic-bezier(.5,-0.3,.6,1)' },
  ).onfinish = () => {
    el.remove();
    to.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 300 });
  };
}
