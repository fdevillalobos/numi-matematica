// Pantalla de juego: lecciones, práctica mágica, tablas, carrera, desafío inicial y prueba de salto.
import {
  SKILL, SKILLS, OPS, WORLDS, buildLesson, buildSmart, generate, makeProblem, pickFormat, recordAnswer,
  finishLesson, Placement, speedSkill, skillState, shuffle, skillsOf,
} from './engine.js';
import { explain, hint, speakProblem } from './visuals.js';
import { sfx, say } from './sound.js';
import { confetti, flyStar } from './fx.js';
import { mascot, modal, esc } from './ui.js';
import { PRAISE, COMBO_PRAISE, OOPS } from './data.js';
import { inkPad, segment, setPersonalTemplates } from './ink.js';

const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const SPEED_SECONDS = 60;
const BOSS_HP = 10;
export const BOSSES = { add: ['🦀', 'Cangrejo Sumador'], sub: ['🦉', 'Búho Restón'], mul: ['👾', 'Marciano Multiplicón'], div: ['🐉', 'Dragón Divisor'] };

function skillForTable(n) {
  return SKILLS.find((s) => s.tables && s.tables.length <= 3 && s.tables.includes(n))?.id || 'mul9';
}

export function playScreen(app, session) {
  const { state } = app;
  const kind = session.kind;
  let queue = [];
  let placement = null;
  if (kind === 'lesson') queue = buildLesson(state, session.skill, 10);
  else if (kind === 'smart') queue = buildSmart(state, 10, session.focus);
  else if (kind === 'table') {
    const sk = skillForTable(session.table);
    queue = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((x) => {
      const swap = Math.random() < 0.3;
      return makeProblem(sk, swap ? x : session.table, swap ? session.table : x, pickFormat(skillState(state, sk)));
    });
  } else if (kind === 'jump') queue = buildLesson(state, session.skill, 5).map((p) => makeProblem(p.skill, p.a, p.b, 'input'));
  else if (kind === 'placement') placement = new Placement(state);
  else if (kind === 'boss') queue = Array.from({ length: BOSS_HP + 2 }, () => generate(state, speedSkill(state, session.op)));

  const mainCount = queue.length;
  const op = kind === 'speed' || kind === 'boss' ? session.op : kind === 'lesson' || kind === 'jump' ? SKILL[session.skill].op : kind === 'table' ? 'mul' : null;
  const world = WORLDS.find((w) => w.id === op);

  let idx = 0;
  let current = null;
  let input = '';
  let shownAt = 0;
  let hinted = false;
  let combo = 0;
  let bestCombo = 0;
  let firstTryCorrect = 0;
  let answered = 0;
  let correctCount = 0;
  let earned = 0;
  let totalMs = 0;
  let locked = false;
  let retries = 0;
  const events = [];
  let speedEnd = 0;
  let speedTimer = null;
  let pad = null;
  let bossHp = BOSS_HP;
  const pencilOn = state.settings.pencil !== false && kind !== 'speed' && kind !== 'placement';
  setPersonalTemplates(state.ink);

  const root = app.root;
  root.innerHTML = `
  <div class="screen play ${world ? `theme-${world.id}` : 'theme-magic'}">
    <header class="play-top">
      <button class="btn-round js-quit" aria-label="Salir">✕</button>
      <div class="play-progress js-progress"></div>
      <div class="combo js-combo"></div>
      <div class="pill pill-stars js-stars">⭐ <b>${state.stars}</b></div>
    </header>
    <main class="play-main">
      <section class="play-left">
        <div class="play-mascot">
          <div class="js-mascot">${mascot('happy', 130)}</div>
          ${kind === 'boss' ? `<div class="boss"><span class="boss-emoji js-boss">${BOSSES[session.op][0]}</span><div class="boss-hp"><i class="js-hp" style="width:100%"></i></div><b>${BOSSES[session.op][1]}</b></div>` : ''}
          <div class="bubble js-bubble">${kind === 'placement' ? '¡Veamos cuánto sabés!' : kind === 'speed' ? '¡Lo más rápido que puedas!' : kind === 'boss' ? '¡Cada respuesta bien le saca vida!' : '¡Vamos!'}</div>
        </div>
        <div class="problem-card js-card"><div class="problem js-problem"></div>
          <div class="play-tools">
            ${kind !== 'speed' && kind !== 'placement' && kind !== 'jump' && kind !== 'boss' ? '<button class="tool js-hint">💡 Ayuda</button>' : ''}
            ${pencilOn ? '<button class="tool js-mode" aria-label="Cambiar forma de responder">✏️ Lápiz</button>' : ''}
            <button class="tool js-say" aria-label="Escuchar">🔊</button>
          </div>
        </div>
        <div class="play-label">${esc(labelFor())}</div>
      </section>
      <section class="play-right js-input"></section>
    </main>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const card = $('.js-card');

  function labelFor() {
    if (kind === 'lesson' || kind === 'jump') return `${world.emoji} ${SKILL[session.skill].name}${kind === 'jump' ? ' · Prueba de salto' : ''}`;
    if (kind === 'smart') return '✨ Práctica mágica';
    if (kind === 'table') return `🔢 Tabla del ${session.table}`;
    if (kind === 'boss') return `⚔️ ¡Batalla contra el ${BOSSES[session.op][1]}!`;
    if (kind === 'speed') return `⏱️ Carrera de ${world.short}`;
    return '🧭 Desafío inicial';
  }

  function setMascot(mood, text) {
    $('.js-mascot').innerHTML = mascot(mood, 130, 'pop-in');
    if (text) {
      const b = $('.js-bubble');
      b.innerHTML = text;
      b.classList.remove('pop');
      void b.offsetWidth;
      b.classList.add('pop');
    }
  }

  function renderProgress() {
    const el = $('.js-progress');
    if (kind === 'speed') {
      const left = Math.max(0, speedEnd - Date.now());
      el.innerHTML = `<div class="timer"><div class="timer-fill" style="width:${(left / (SPEED_SECONDS * 1000)) * 100}%"></div><span>${Math.ceil(left / 1000)} s · ${correctCount} ✔︎</span></div>`;
      return;
    }
    if (kind === 'placement') {
      el.innerHTML = `<div class="bar"><div class="bar-fill" style="width:${Math.min(100, placement.count * 5)}%"></div></div>`;
      return;
    }
    el.innerHTML = `<div class="segments">${queue.map((p, i) => `<span class="seg ${i < idx ? (p._ok ? 'ok' : 'bad') : i === idx ? 'now' : ''} ${p._retry ? 'retry' : ''}"></span>`).join('')}</div>`;
  }

  function renderCombo() {
    $('.js-combo').innerHTML = combo >= 2 ? `<span class="combo-badge ${combo >= 5 ? 'hot' : ''}">🔥 ${combo}</span>` : '';
  }

  function problemHtml(p) {
    const s = OPS[p.op].sym;
    const box = p.format === 'choice' ? '<span class="answer-box q">?</span>' : `<span class="answer-box js-answer ${input ? 'filled' : ''}">${input || '&nbsp;'}</span>`;
    const vertical = p.format !== 'missing' && (((p.op === 'add' || p.op === 'sub') && Math.min(p.a, p.b) >= 10) || (p.op === 'mul' && Math.max(p.a, p.b) >= 11));
    if (vertical) {
      const [top, bottom] = p.op === 'mul' ? [Math.max(p.a, p.b), Math.min(p.a, p.b)] : [p.a, p.b];
      return `<div class="vertical"><span>${top}</span><span><i>${s}</i>${bottom}</span><hr>${box}</div>`;
    }
    const len = String(p.a).length + String(p.b).length + String(p.c).length;
    const size = len > 7 ? 'sm' : len > 5 ? 'md' : 'lg';
    if (p.format === 'missing') return `<div class="horizontal ${size}"><span>${p.a}</span><i>${s}</i>${box}<i>=</i><span>${p.c}</span></div>`;
    return `<div class="horizontal ${size}"><span>${p.a}</span><i>${s}</i><span>${p.b}</span><i>=</i>${box}</div>`;
  }

  function updateModeBtn() {
    const b = root.querySelector('.js-mode');
    if (!b) return;
    b.hidden = current.format === 'choice';
    b.textContent = current.format === 'draw' ? '🔢 Teclado' : '✏️ Lápiz';
  }

  function renderInput() {
    const el = $('.js-input');
    pad?.destroy();
    pad = null;
    if (current.format === 'draw') {
      el.innerHTML = `<div class="ink"><div class="js-pad"></div>
        <div class="ink-btns"><button class="key key-del js-ink-clear" aria-label="Borrar">🧽</button><button class="key key-ok js-ink-ok" aria-label="Listo">✓</button></div></div>`;
      pad = inkPad(el.querySelector('.js-pad'), { onChange: (t) => { input = t.slice(0, 4); updateAnswer(); } });
      el.querySelector('.js-ink-clear').addEventListener('click', () => { sfx('pop'); pad.clear(); });
      el.querySelector('.js-ink-ok').addEventListener('click', () => {
        if (input) check(input);
        else { const pd = el.querySelector('.ink-pad'); pd.classList.remove('shake'); void pd.offsetWidth; pd.classList.add('shake'); }
      });
      return;
    }
    if (current.format === 'choice') {
      el.innerHTML = `<div class="choices">${current.choices.map((v, i) => `<button class="choice c${i}" data-v="${v}" style="--d:${i * 70}ms">${v}</button>`).join('')}</div>`;
    } else {
      el.innerHTML = `<div class="keypad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
        <button class="key key-del" data-k="del" aria-label="Borrar">⌫</button><button class="key" data-k="0">0</button>
        <button class="key key-ok" data-k="ok" aria-label="Listo">✓</button></div>`;
    }
  }

  function updateAnswer() {
    const a = root.querySelector('.js-answer');
    if (a) { a.innerHTML = input || '&nbsp;'; a.classList.toggle('filled', !!input); fitProblem(); }
  }

  function next() {
    locked = false;
    input = '';
    hinted = false;
    if (kind === 'placement') {
      current = placement.current();
      if (!current) return finish();
    } else if (kind === 'speed') {
      if (Date.now() >= speedEnd) return finish();
      current = generate(state, speedSkill(state, op), 'input');
    } else {
      if (idx >= queue.length) return finish();
      current = queue[idx];
    }
    if (pencilOn && !current._fmt) {
      current._fmt = true;
      if (current.format === 'input' && Math.random() < 0.4) current.format = 'draw';
    }
    $('.js-problem').innerHTML = problemHtml(current);
    fitProblem();
    card.classList.remove('good', 'bad', 'shake');
    card.classList.remove('enter');
    void card.offsetWidth;
    card.classList.add('enter');
    renderInput();
    updateModeBtn();
    renderProgress();
    shownAt = performance.now();
  }

  // Achica la letra si el problema no entra en la tarjeta.
  function fitProblem() {
    const inner = $('.js-problem').firstElementChild;
    if (!inner) return;
    inner.style.fontSize = '';
    const max = card.clientWidth - 50;
    let fs = parseFloat(getComputedStyle(inner).fontSize);
    while (inner.scrollWidth > max && fs > 40) {
      fs -= 6;
      inner.style.fontSize = `${fs}px`;
    }
  }

  function praise() {
    if (combo >= 5 && combo % 5 === 0) return pickOne(COMBO_PRAISE);
    return pickOne(PRAISE);
  }

  function check(value) {
    if (locked || !current) return;
    if (value === '' || value === undefined) return;
    locked = true;
    const ms = performance.now() - shownAt;
    const ok = Number(value) === current.answer;
    const p = current;
    answered++;
    totalMs += ms;
    if (kind !== 'placement') {
      const ev = recordAnswer(state, p, ok, ms, { hinted });
      events.push(...ev);
      app.handleEvents(ev);
    }
    if (ok) onCorrect(p, ms); else onWrong(p, value);
  }

  // Guarda su letra: cada cifra confirmada como correcta queda como plantilla propia.
  function learnInk(p) {
    if (p.format !== 'draw' || !pad) return;
    const groups = segment(pad.strokes());
    const digits = String(p.answer);
    if (groups.length !== digits.length) return;
    state.ink ||= [];
    groups.forEach((g, i) => {
      const strokes = g.strokes.map((st) => st.filter((_, k) => k % Math.ceil(st.length / 40 || 1) === 0).map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) })));
      state.ink.push({ digit: digits[i], strokes });
      const mine = state.ink.filter((t) => t.digit === digits[i]);
      if (mine.length > 4) state.ink.splice(state.ink.indexOf(mine[0]), 1);
    });
    setPersonalTemplates(state.ink);
  }

  function onCorrect(p) {
    if (p.format === 'draw') app.track('draw');
    learnInk(p);
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    correctCount++;
    if (!p._retry) { p._ok = true; firstTryCorrect++; }
    else p._ok = true;
    const gain = (hinted ? 0 : 1) + (combo >= 5 ? 1 : 0);
    if (gain > 0 && kind !== 'placement') {
      earned += gain;
      state.stars += gain;
      flyStar(card);
      setTimeout(() => { const s = root.querySelector('.js-stars b'); if (s) s.textContent = state.stars; }, 800);
    }
    app.addXp(kind === 'placement' ? 5 : 10 + Math.min(combo, 10));
    state.totals.bestCombo = Math.max(state.totals.bestCombo, combo);
    if (combo >= 2) app.track('combo', combo, 'max');
    card.classList.add('good');
    const box = root.querySelector('.js-answer');
    if (box) box.innerHTML = p.answer;
    root.querySelectorAll('.choice').forEach((b) => { if (Number(b.dataset.v) === p.answer) b.classList.add('right'); else b.classList.add('fade'); });
    sfx(combo >= 5 && combo % 5 === 0 ? 'combo' : 'correct');
    const r = card.getBoundingClientRect();
    confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: combo >= 5 ? 50 : 26, spread: 0.7 });
    const text = praise();
    setMascot('party', text);
    if (kind !== 'speed' && combo % 5 === 0) say(text.replace(/[¡!]/g, ''));
    renderCombo();
    if (kind === 'placement') placement.answer(p, true, performance.now() - shownAt);
    if (kind === 'boss') {
      bossHp--;
      const be = root.querySelector('.js-boss');
      be.classList.remove('hit'); void be.offsetWidth; be.classList.add('hit');
      root.querySelector('.js-hp').style.width = `${(bossHp / BOSS_HP) * 100}%`;
      sfx('pop');
      if (bossHp <= 0) { idx = queue.length; app.save(); setTimeout(finish, 900); return; }
    }
    if (kind !== 'speed' && kind !== 'placement') idx++;
    app.save();
    setTimeout(next, kind === 'speed' ? 350 : 950);
  }

  function onWrong(p, value) {
    combo = 0;
    renderCombo();
    sfx('wrong');
    card.classList.add('bad', 'shake');
    const box = root.querySelector('.js-answer');
    if (box) box.innerHTML = `<s>${esc(value)}</s>`;
    root.querySelectorAll('.choice').forEach((b) => {
      if (Number(b.dataset.v) === Number(value)) b.classList.add('wrong');
    });
    app.save();

    if (kind === 'speed') {
      setMascot('wow', `Era <b>${p.answer}</b>`);
      setTimeout(next, 1100);
      return;
    }
    if (kind === 'placement') {
      setMascot('happy', '¡Bien! Sigamos con otra cosa');
      placement.answer(p, false, 0);
      setTimeout(next, 900);
      return;
    }
    if (kind === 'jump') {
      p._ok = false;
      idx++;
      setTimeout(() => finishJump(false), 700);
      return;
    }
    p._ok = false;
    if (kind === 'boss') {
      const be = root.querySelector('.js-boss');
      be.classList.remove('laugh'); void be.offsetWidth; be.classList.add('laugh');
    }
    // Revancha: vuelve al final de la lección (máximo 3)
    if (kind !== 'boss' && !p._retry && retries < 3) {
      retries++;
      const again = makeProblem(p.skill, p.a, p.b, 'input');
      again._retry = true;
      queue.push(again);
    }
    setMascot('think', pickOne(OOPS));
    setTimeout(() => showExplanation(p, value), 650);
  }

  function showExplanation(p, value) {
    const ex = explain(p);
    say(ex.speech);
    const m = modal(`<div class="explain">
        <div class="explain-head">${mascot('think', 90)}<h2>¡Veamos cómo se hace!</h2></div>
        <p class="explain-you">${p.format === 'draw' ? `Numi leyó ${esc(value)}` : `Pusiste ${esc(value)}`}, pero era ${p.answer}. ¡Vas a ver que la próxima te sale!</p>
        ${ex.html}
        <button class="btn btn-big btn-go" data-close>¡Entendido! 👍</button>
      </div>`, { cls: 'modal-explain', dismissable: false, onClose: () => { idx++; next(); } });
    return m;
  }

  function showHint() {
    if (!current || locked) return;
    hinted = true;
    sfx('pop');
    modal(`<div class="explain">${hint(current)}<button class="btn btn-big btn-go" data-close>¡Ya sé! ✏️</button></div>`, { cls: 'modal-explain' });
  }

  function finishJump(passed) {
    cleanup();
    const s = SKILL[session.skill];
    if (passed) {
      const list = skillsOf(s.op);
      const i = list.findIndex((k) => k.id === s.id);
      for (let j = 0; j <= i; j++) {
        const st = skillState(state, list[j].id);
        st.unlocked = true;
        if (j < i) st.placed = true;
      }
      app.save();
      sfx('fanfare');
      app.celebrate();
      app.go('world', { op: s.op, msg: `¡Saltaste a ${s.name}! 🎉`, highlight: s.id });
    } else {
      app.save();
      modal(`<div class="center">${mascot('happy', 120)}<h2>¡Casi!</h2><p>Para saltar hay que responder las 5 bien.<br>¡Practicá un poquito más y volvé a intentarlo!</p>
        <button class="btn btn-big btn-go" data-close>Volver</button></div>`, { onClose: () => app.go('world', { op: s.op }) });
    }
  }

  function finish() {
    cleanup();
    if (kind === 'jump') return finishJump(firstTryCorrect === mainCount);
    if (kind === 'placement') {
      const result = placement.apply();
      state.placementDone = true;
      app.save();
      return app.go('placementResult', { result });
    }
    if (kind === 'boss') {
      const won = bossHp <= 0;
      state.bosses ||= {};
      const first = won && !state.bosses[op];
      if (won) { state.bosses[op] = (state.bosses[op] || 0) + 1; state.stars += first ? 30 : 10; earned += first ? 30 : 10; }
      state.totals.lessons++;
      app.track('lesson');
      app.save();
      app.checkBadges();
      return app.go('bossResult', { op, won, first, earned, left: bossHp });
    }
    if (kind === 'speed') {
      const key = `speed_${op}`;
      const prev = state.records[key] || 0;
      const record = correctCount > prev;
      if (record) state.records[key] = correctCount;
      app.track('speed');
      state.totals.lessons++;
      app.save();
      app.checkBadges();
      return app.go('speedResult', { op, score: correctCount, prev, record, earned });
    }
    let lesson = null;
    if (kind === 'lesson') {
      lesson = finishLesson(state, session.skill, firstTryCorrect, mainCount);
      app.handleEvents(lesson.events);
      events.push(...lesson.events);
    }
    const stars = lesson ? lesson.stars : firstTryCorrect / mainCount >= 0.9 ? 3 : firstTryCorrect / mainCount >= 0.7 ? 2 : firstTryCorrect / mainCount >= 0.5 ? 1 : 0;
    const bonus = stars * 3;
    state.stars += bonus;
    earned += bonus;
    state.totals.lessons++;
    if (firstTryCorrect === mainCount) state.totals.perfect++;
    app.track(kind === 'lesson' ? 'lesson' : kind === 'table' ? 'table' : 'smart');
    if (kind !== 'lesson') app.track('lesson');
    app.save();
    app.checkBadges();
    app.go('result', {
      session, stars, correct: firstTryCorrect, total: mainCount, avg: answered ? totalMs / answered / 1000 : 0,
      earned, bestCombo, unlocked: events.filter((e) => e.type === 'unlock').map((e) => e.skill),
      crowns: events.filter((e) => e.type === 'crown').map((e) => e.skill),
    });
  }

  // ---- eventos ----
  function onKey(k) {
    if (locked || !current || current.format === 'choice') return;
    if (k === 'del') { input = input.slice(0, -1); sfx('key'); updateAnswer(); return; }
    if (k === 'ok') { if (input) check(input); return; }
    if (input.length >= 4) return;
    sfx('key');
    input += k;
    updateAnswer();
    if (kind === 'speed' && input.length === String(current.answer).length) check(input);
  }

  root.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.key[data-k]');
    if (key) { e.preventDefault(); key.classList.add('down'); setTimeout(() => key.classList.remove('down'), 120); onKey(key.dataset.k); return; }
    const ch = e.target.closest('.choice');
    if (ch && !locked) { e.preventDefault(); check(ch.dataset.v); }
  });
  root.addEventListener('click', (e) => {
    if (e.target.closest('.js-quit')) {
      sfx('tap');
      if (answered === 0 || kind === 'speed') { cleanup(); app.back(); return; }
      modal(`<div class="center">${mascot('sad', 110)}<h2>¿Querés salir?</h2><p>Lo que respondiste ya quedó guardado.</p>
        <div class="row"><button class="btn btn-go js-stay" data-close>Seguir jugando</button><button class="btn btn-soft js-leave">Salir</button></div></div>`)
        .el.querySelector('.js-leave').addEventListener('click', () => { document.querySelector('.modal-wrap')?.remove(); cleanup(); app.back(); });
    }
    if (e.target.closest('.js-hint')) showHint();
    if (e.target.closest('.js-mode') && current && !locked && current.format !== 'choice') {
      sfx('pop');
      current.format = current.format === 'draw' ? 'input' : 'draw';
      input = '';
      updateAnswer();
      renderInput();
      updateModeBtn();
    }
    if (e.target.closest('.js-say') && current) say(speakProblem(current));
  });
  const keyHandler = (e) => {
    if (document.querySelector('.modal-wrap')) {
      if (e.key === 'Enter') document.querySelector('.modal-wrap [data-close].btn')?.click();
      return;
    }
    if (/^[0-9]$/.test(e.key)) onKey(e.key);
    else if (e.key === 'Backspace') onKey('del');
    else if (e.key === 'Enter') onKey('ok');
    else if (current?.format === 'choice' && /^[1-4]$/.test(e.key)) check(current.choices[Number(e.key) - 1]);
  };
  document.addEventListener('keydown', keyHandler);

  addEventListener('resize', fitProblem);
  function cleanup() {
    removeEventListener('resize', fitProblem);
    pad?.destroy();
    document.removeEventListener('keydown', keyHandler);
    clearInterval(speedTimer);
  }
  app.onLeave(cleanup);

  // ---- arranque ----
  if (kind === 'speed') {
    let count = 3;
    $('.js-problem').innerHTML = `<div class="countdown">${count}</div>`;
    sfx('tick');
    const cd = setInterval(() => {
      count--;
      if (count > 0) { $('.js-problem').innerHTML = `<div class="countdown">${count}</div>`; sfx('tick'); return; }
      clearInterval(cd);
      sfx('whoosh');
      speedEnd = Date.now() + SPEED_SECONDS * 1000;
      speedTimer = setInterval(() => {
        renderProgress();
        if (Date.now() >= speedEnd && !locked) finish();
      }, 250);
      next();
    }, 800);
    app.onLeave(() => clearInterval(cd));
  } else {
    next();
  }
  renderCombo();
}
