// Juego de globos: la respuesta correcta sube en un globo, ¡hay que reventarlo antes de que se escape!
import { OPS, generate, smartSkill, recordAnswer, shuffle } from './engine.js';
import { sfx, say } from './sound.js';
import { confetti } from './fx.js';
import { mascot } from './ui.js';

const COLORS = ['#FF5D8F', '#3B9EFF', '#FFB703', '#2EC27E', '#8B5CF6', '#FF8A3D'];

export function balloonsScreen(app) {
  const { state } = app;
  const root = app.root;
  root.innerHTML = `<div class="screen balloons">
    <header class="play-top">
      <button class="btn-round js-quit" aria-label="Salir">✕</button>
      <div class="bl-question js-q"></div>
      <div class="pill js-lives">❤️❤️❤️</div>
      <div class="pill pill-stars js-stars">⭐ <b>${state.stars}</b></div>
    </header>
    <div class="bl-sky js-sky"><div class="bl-score js-score">0</div></div>
  </div>`;
  const $ = (q) => root.querySelector(q);
  const sky = $('.js-sky');
  let lives = 3;
  let score = 0;
  let p = null;
  let shownAt = 0;
  let balloons = [];
  let raf = 0;
  let last = 0;
  let over = false;
  let busy = false;

  const speed = () => 70 + Math.min(score, 25) * 7; // px por segundo

  function question() {
    if (over) return;
    busy = false;
    p = generate(state, smartSkill(state), 'choice');
    $('.js-q').innerHTML = `${p.a} ${OPS[p.op].sym} ${p.b} = <span>?</span>`;
    sky.querySelectorAll('.balloon').forEach((b) => b.remove());
    const H = sky.clientHeight;
    const lanes = shuffle([0, 1, 2, 3]);
    balloons = p.choices.map((v, i) => {
      const el = document.createElement('button');
      el.className = 'balloon';
      el.style.setProperty('--bc', COLORS[(i + score) % COLORS.length]);
      el.style.left = `${8 + lanes[i] * 23 + Math.random() * 4}%`;
      el.innerHTML = `<span>${v}</span><i></i>`;
      el.dataset.v = v;
      sky.appendChild(el);
      const b = { el, v, y: H - 120 - Math.random() * 140, wobble: Math.random() * 6 };
      el.style.transform = `translateY(${b.y}px)`;
      return b;
    });
    shownAt = performance.now();
  }

  function step(t) {
    const dt = last ? (t - last) / 1000 : 0;
    last = t;
    if (!busy) {
      for (const b of balloons) {
        b.y -= speed() * dt;
        b.el.style.transform = `translateY(${b.y}px) rotate(${Math.sin(t / 500 + b.wobble) * 6}deg)`;
      }
      const right = balloons.find((b) => b.v === p?.answer);
      if (right && right.y < -200) escaped();
    }
    if (!over) raf = requestAnimationFrame(step);
  }

  function hearts() { $('.js-lives').textContent = '❤️'.repeat(lives) + '🤍'.repeat(3 - lives); }

  function loseLife(text) {
    lives--;
    hearts();
    sfx('wrong');
    $('.js-lives').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 400 });
    if (lives <= 0) return end();
    $('.js-q').innerHTML = text;
    setTimeout(question, 1400);
  }

  function escaped() {
    busy = true;
    recordAnswer(state, p, false, performance.now() - shownAt);
    loseLife(`¡Se escapó! Era <span>${p.answer}</span>`);
  }

  sky.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.balloon');
    if (!el || busy || over) return;
    e.preventDefault();
    const v = Number(el.dataset.v);
    if (v === p.answer) {
      busy = true;
      const ms = performance.now() - shownAt;
      app.handleEvents(recordAnswer(state, p, true, ms));
      score++;
      state.stars++;
      app.addXp(10);
      $('.js-score').textContent = score;
      $('.js-stars b').textContent = state.stars;
      el.classList.add('popped');
      sfx('pop');
      setTimeout(() => sfx('correct'), 80);
      const r = el.getBoundingClientRect();
      confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 40, spread: 0.8 });
      app.save();
      setTimeout(question, 550);
    } else {
      el.classList.add('popped', 'bad');
      busy = true;
      app.handleEvents(recordAnswer(state, p, false, performance.now() - shownAt));
      app.save();
      loseLife(`${p.a} ${OPS[p.op].sym} ${p.b} = <span>${p.answer}</span>`);
    }
  });

  function end() {
    over = true;
    cancelAnimationFrame(raf);
    const prev = state.records.balloons || 0;
    const record = score > prev;
    if (record) state.records.balloons = score;
    app.track('balloons');
    state.totals.lessons++;
    app.save();
    app.checkBadges();
    sky.innerHTML = `<div class="bl-end">${mascot(record ? 'party' : 'happy', 160, 'bob')}
      <h1>${record ? '¡Nuevo récord!' : '¡Muy bien!'}</h1><div class="speed-score">${score}</div>
      <p class="result-sub">globos reventados · récord ${Math.max(prev, score)} 🏆</p>
      <div class="row"><button class="btn btn-soft js-home">🏠 Inicio</button><button class="btn btn-go js-again">🎈 ¡Otra vez!</button></div></div>`;
    if (record && score > 0) { sfx('fanfare'); app.celebrate(); say('¡Nuevo récord!'); }
    sky.querySelector('.js-again').addEventListener('click', () => app.go('balloons', {}, { push: false }));
    sky.querySelector('.js-home').addEventListener('click', () => app.go('home', {}, { push: false }));
  }

  $('.js-quit').addEventListener('click', () => { sfx('tap'); app.back(); });
  app.onLeave(() => { over = true; cancelAnimationFrame(raf); });

  hearts();
  question();
  raf = requestAnimationFrame(step);
}
