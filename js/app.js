import {
  WORLDS, SKILL, SKILLS, skillsOf, skillState, frontier, levelFromXp, todayKey, speedOf, isWorldComplete,
} from './engine.js';
import { load, save, reset, exportJson, importJson } from './store.js';
import { sfx, say, unlock as unlockAudio, configure as configureSound, spanishVoices, currentVoice } from './sound.js';
import { confetti, bigCelebration } from './fx.js';
import { mascot, bubble, toast, modal, esc, progressRing, starsHtml, setOutfit } from './ui.js';
import { AVATARS, STICKERS, RARITY, PACK_COST, BADGES, OUTFITS, MISSIONS, MISSION_PRIZE } from './data.js';
import { dotArray } from './visuals.js';
import { playScreen } from './game.js';
import { balloonsScreen } from './balloons.js';

const host = document.getElementById('app');
let state = load();
configureSound(state.settings);
setOutfit(state.outfit);

const leaveFns = [];
const history = [];
let currentScreen = null;

const app = {
  get state() { return state; },
  root: null,
  save: () => save(state),
  go(name, params = {}, { push = true } = {}) {
    while (leaveFns.length) { try { leaveFns.pop()(); } catch (e) { console.error(e); } }
    document.querySelectorAll('.modal-wrap').forEach((m) => m.remove());
    if (push && currentScreen && currentScreen.name !== 'play' && !currentScreen.name.endsWith('esult')) history.push(currentScreen);
    currentScreen = { name, params };
    const el = document.createElement('div');
    el.className = 'host';
    host.replaceChildren(el);
    app.root = el;
    window.scrollTo(0, 0);
    (SCREENS[name] || SCREENS.home)(params);
  },
  back() {
    let prev = history.pop();
    while (prev && prev.name === currentScreen?.name) prev = history.pop();
    if (prev) app.go(prev.name, prev.params, { push: false });
    else app.go('home', {}, { push: false });
  },
  onLeave(fn) { leaveFns.push(fn); },
  play(session) { sfx('tap'); app.go('play', session); },
  handleEvents(events) {
    for (const ev of events) {
      if (ev.type === 'unlock') {
        state.stars += 5;
        notify(`🔓 ¡Nuevo nivel: <b>${esc(SKILL[ev.skill].name)}</b>! +5⭐`, 'unlock');
        sfx('levelup');
      } else if (ev.type === 'crown') {
        state.stars += 10;
        notify(`👑 ¡Corona en <b>${esc(SKILL[ev.skill].name)}</b>! Sos rapidísima. +10⭐`, 'crown');
        sfx('fanfare');
      }
    }
    if (events.length) app.checkBadges();
  },
  addXp(n) {
    const before = levelFromXp(state.xp).level;
    state.xp += n;
    const after = levelFromXp(state.xp).level;
    if (after > before) setTimeout(() => levelUp(after), 1000);
    const d = state.daily[todayKey()];
    if (d && !d.goalDone && d.problems >= state.settings.dailyGoal) {
      d.goalDone = true;
      state.stars += 10;
      notify('🎯 ¡Cumpliste la meta del día! +10⭐', 'goal');
    }
    app.checkBadges();
  },
  checkBadges() {
    for (const b of BADGES) {
      if (!state.badges[b.id] && b.test(state)) {
        state.badges[b.id] = Date.now();
        notify(`🏅 Nueva medalla: <b>${b.emoji} ${esc(b.name)}</b>`, 'badge');
      }
    }
    save(state);
  },
  celebrate: bigCelebration,
  // Contadores del día para las misiones.
  track(key, value = 1, mode = 'add') {
    const d = (state.daily[todayKey()] ||= { problems: 0, correct: 0, ms: 0 });
    d.counts ||= {};
    d.counts[key] = mode === 'max' ? Math.max(d.counts[key] || 0, value) : (d.counts[key] || 0) + value;
    d.missionsDone ||= {};
    for (const m of todayMissions()) {
      const n = m.key === 'correct' ? d.correct : d.counts[m.key] || 0;
      if (!d.missionsDone[m.id] && n >= m.goal) {
        d.missionsDone[m.id] = true;
        state.stars += MISSION_PRIZE;
        notify(`✅ Misión cumplida: <b>${m.emoji} ${esc(m.text)}</b> +${MISSION_PRIZE}⭐`, 'goal');
        sfx('levelup');
      }
    }
    save(state);
  },
};

function todayMissions() {
  // Elección estable por día
  const k = todayKey();
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = MISSIONS.slice();
  const out = [];
  while (out.length < 3) { out.push(pool.splice(h % pool.length, 1)[0]); h = Math.floor(h / 7) + 13; }
  return out;
}

function missionsHtml() {
  const d = state.daily[todayKey()] || {};
  return `<div class="missions"><b class="missions-title">Misiones de hoy</b>${todayMissions().map((m) => {
    const n = Math.min(m.goal, m.key === 'correct' ? d.correct || 0 : d.counts?.[m.key] || 0);
    const done = d.missionsDone?.[m.id];
    return `<div class="mission ${done ? 'done' : ''}"><span>${done ? '✅' : m.emoji}</span><div><b>${esc(m.text)}</b>
      <i class="mbar"><i style="width:${(n / m.goal) * 100}%"></i></i></div><small>${done ? '¡Listo!' : `${n}/${m.goal}`}</small></div>`;
  }).join('')}</div>`;
}

// Cola de avisos para que no se pisen.
const notes = [];
let noting = false;
function notify(html, kind) {
  notes.push({ html, kind });
  if (!noting) drain();
}
function drain() {
  const n = notes.shift();
  if (!n) { noting = false; return; }
  noting = true;
  toast(n.html, { kind: n.kind, ms: 2400 });
  setTimeout(drain, 2600);
}

function levelUp(level) {
  sfx('levelup');
  bigCelebration();
  say(`¡Subiste al nivel ${level}!`);
  if (currentScreen?.name === 'play') { notify(`🎉 ¡Subiste al <b>nivel ${level}</b>!`, 'crown'); return; }
  modal(`<div class="center levelup">${mascot('party', 170)}<div class="levelup-badge">${level}</div><h2>¡Subiste de nivel!</h2>
    <p>Ahora sos nivel <b>${level}</b>. ¡Seguí así, ${esc(state.profile?.name || '')}!</p><button class="btn btn-big btn-go" data-close>¡Yupi! 🎉</button></div>`);
}

// ---------- componentes ----------
function topbar({ back = false, title = '' } = {}) {
  const lv = levelFromXp(state.xp);
  const today = state.daily[todayKey()];
  const done = today ? today.problems : 0;
  const goal = state.settings.dailyGoal;
  return `<header class="topbar">
    ${back ? '<button class="btn-round js-back" aria-label="Volver">←</button>' : `<div class="me"><span class="avatar">${state.profile?.avatar || '🦄'}</span>
      <div class="me-info"><b>${esc(state.profile?.name || '')}</b><div class="lvl"><span>Nivel ${lv.level}</span><div class="lvl-bar"><div style="width:${(lv.into / lv.need) * 100}%"></div></div></div></div></div>`}
    ${title ? `<h1 class="top-title">${title}</h1>` : '<div class="grow"></div>'}
    <div class="top-pills">
      <div class="pill pill-goal" title="Meta del día">${progressRing(done / goal, 40, 6, '#2EC27E', '🎯')}<span>${Math.min(done, goal)}/${goal}</span></div>
      <div class="pill pill-streak" title="Días seguidos">🔥 <b>${state.streak.current || 0}</b></div>
      <div class="pill pill-stars js-stars">⭐ <b>${state.stars}</b></div>
      ${back ? '' : '<button class="btn-round js-parents" aria-label="Adultos">⚙️</button>'}
    </div>
  </header>`;
}

function bindTop(root) {
  root.querySelector('.js-back')?.addEventListener('click', () => { sfx('tap'); app.back(); });
  const p = root.querySelector('.js-parents');
  if (p) {
    let t;
    const start = () => { p.classList.add('holding'); t = setTimeout(() => { p.classList.remove('holding'); sfx('tap'); app.go('parents'); }, 1200); };
    const stop = () => { p.classList.remove('holding'); clearTimeout(t); };
    p.addEventListener('pointerdown', start);
    p.addEventListener('pointerup', stop);
    p.addEventListener('pointerleave', stop);
    p.addEventListener('click', () => toast('Para adultos: mantené apretado ⚙️'));
  }
}

function worldStats(op) {
  const list = skillsOf(op);
  const unlocked = list.filter((s) => skillState(state, s.id).unlocked || state.settings.unlockAll).length;
  const stars = list.reduce((acc, s) => acc + skillState(state, s.id).stars, 0);
  const crowns = list.filter((s) => skillState(state, s.id).crowned).length;
  const passed = list.filter((s) => { const st = skillState(state, s.id); return st.stars >= 2 || st.placed || st.crowned; }).length;
  return { total: list.length, unlocked, stars, crowns, passed };
}

const isUnlocked = (id) => state.settings.unlockAll || skillState(state, id).unlocked;

// ---------- pantallas ----------
const SCREENS = {
  onboarding() {
    const root = app.root;
    let avatar = state.profile?.avatar || '🦄';
    root.innerHTML = `<div class="screen onboarding">
      <div class="onb-card">
        <div class="onb-mascot">${mascot('happy', 200)}${bubble('¡Hola! Soy <b>Numi</b> 💜<br>Me encantan los números. ¿Cómo te llamás?', 'bubble-left')}</div>
        <input class="name-input js-name" maxlength="16" value="${esc(state.profile?.name || 'Isabella')}" aria-label="Nombre" autocomplete="off">
        <p class="onb-sub">Elegí tu compañero:</p>
        <div class="avatars">${AVATARS.map((a) => `<button class="avatar-pick ${a === avatar ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
        <button class="btn btn-big btn-go js-ok">¡Listo! →</button>
      </div></div>`;
    root.querySelector('.avatars').addEventListener('click', (e) => {
      const b = e.target.closest('.avatar-pick');
      if (!b) return;
      unlockAudio();
      sfx('pop');
      avatar = b.dataset.a;
      root.querySelectorAll('.avatar-pick').forEach((x) => x.classList.toggle('on', x === b));
    });
    root.querySelector('.js-ok').addEventListener('click', () => {
      unlockAudio();
      const name = root.querySelector('.js-name').value.trim() || 'Isabella';
      state.profile = { name, avatar };
      save(state);
      sfx('levelup');
      say(`¡Hola ${name}! ¡Qué lindo conocerte!`);
      app.go('onboarding2', {}, { push: false });
    });
  },

  onboarding2() {
    const root = app.root;
    root.innerHTML = `<div class="screen onboarding"><div class="onb-card">
      <div class="onb-mascot">${mascot('party', 200)}${bubble(`¡Qué lindo nombre, <b>${esc(state.profile.name)}</b>!<br>¿Hacemos un desafío para ver todo lo que ya sabés?`, 'bubble-left')}</div>
      <p class="onb-sub">Voy a hacerte preguntas cada vez más difíciles. ¡No pasa nada si alguna no sale!</p>
      <div class="col">
        <button class="btn btn-big btn-go js-yes">🧭 ¡Sí, dale!</button>
        <button class="btn btn-soft js-no">Empezar desde el principio</button>
      </div></div></div>`;
    root.querySelector('.js-yes').addEventListener('click', () => app.play({ kind: 'placement' }));
    root.querySelector('.js-no').addEventListener('click', () => { state.placementDone = true; save(state); app.go('home', {}, { push: false }); });
  },

  home() {
    if (!state.profile) return app.go('onboarding', {}, { push: false });
    const root = app.root;
    const name = esc(state.profile.name);
    const hour = new Date().getHours();
    const hello = hour < 12 ? '¡Buen día' : hour < 20 ? '¡Hola' : '¡Buenas noches';
    const mulFront = frontier(state, 'mul');
    const greet = state.totals.problems === 0
      ? `${hello}, ${name}! ¿Arrancamos?`
      : (state.daily[todayKey()]?.goalDone ? `¡Ya cumpliste tu meta de hoy, ${name}! 🎉 ¿Un poquito más?` : `${hello}, ${name}! Hoy podemos practicar <b>${esc(mulFront.name)}</b> 🚀`);
    root.innerHTML = `<div class="screen home">
      ${topbar()}
      <section class="hero">
        <button class="hero-mascot js-numi" aria-label="Vestir a Numi">${mascot('happy', 190, 'bob')}<span class="numi-tag">👗 Vestime</span></button>
        <div class="hero-right">
          ${bubble(greet, 'bubble-left big')}
          <div class="hero-btns"><button class="btn btn-magic js-smart"><span class="sparkle">✨</span> Práctica mágica<small>Numi elige lo justo para vos</small></button>
          ${state.lastChest !== todayKey() ? '<button class="chest js-chest" aria-label="Cofre del día"><span>🎁</span><b>¡Cofre del día!</b></button>' : ''}</div>
          ${missionsHtml()}
        </div>
      </section>
      <section class="worlds">
        ${WORLDS.map((w) => {
          const st = worldStats(w.id);
          return `<button class="world-card" data-op="${w.id}" style="--c:${w.color};--cd:${w.dark};--cs:${w.soft}">
            <span class="world-emoji">${w.emoji}</span>
            <span class="world-name">${w.short}</span>
            <span class="world-meta">⭐ ${st.stars} · ${st.crowns ? `👑 ${st.crowns} · ` : ''}${st.passed}/${st.total}</span>
            <span class="world-bar"><i style="width:${(st.passed / st.total) * 100}%"></i></span>
            ${isWorldComplete(state, w.id) ? '<span class="world-done">🏆</span>' : ''}
          </button>`;
        }).join('')}
      </section>
      <section class="tiles">
        <button class="tile t-speed js-speed"><span>⏱️</span>Carrera</button>
        <button class="tile t-tables js-tables"><span>🔢</span>Mis tablas</button>
        <button class="tile t-stickers js-stickers"><span>📒</span>Stickers</button>
        <button class="tile t-balloons js-balloons"><span>🎈</span>Globos</button>
        <button class="tile t-progress js-progress"><span>🏅</span>Mis avances</button>
      </section>
    </div>`;
    bindTop(root);
    root.querySelector('.js-smart').addEventListener('click', () => { unlockAudio(); app.play({ kind: 'smart' }); });
    root.querySelector('.worlds').addEventListener('click', (e) => {
      const c = e.target.closest('.world-card');
      if (c) { unlockAudio(); sfx('tap'); app.go('world', { op: c.dataset.op }); }
    });
    root.querySelector('.js-speed').addEventListener('click', () => { unlockAudio(); speedPicker(); });
    root.querySelector('.js-tables').addEventListener('click', () => { sfx('tap'); app.go('tables'); });
    root.querySelector('.js-stickers').addEventListener('click', () => { sfx('tap'); app.go('stickers'); });
    root.querySelector('.js-progress').addEventListener('click', () => { sfx('tap'); app.go('progress'); });
    root.querySelector('.js-balloons').addEventListener('click', () => { unlockAudio(); sfx('tap'); app.go('balloons'); });
    root.querySelector('.js-numi').addEventListener('click', () => { unlockAudio(); sfx('pop'); app.go('shop'); });
    root.querySelector('.js-chest')?.addEventListener('click', () => { unlockAudio(); openChest(); });
  },

  world({ op, msg, highlight }) {
    const root = app.root;
    const w = WORLDS.find((x) => x.id === op);
    const list = skillsOf(op);
    const front = frontier(state, op);
    const rowH = 150;
    const xs = list.map((_, i) => 50 + 26 * Math.sin(i * 1.15));
    const H = list.length * rowH + 60;
    const pts = list.map((_, i) => `${xs[i]},${i * rowH + 90}`).join(' ');
    root.innerHTML = `<div class="screen world theme-${op}" style="--c:${w.color};--cd:${w.dark};--cs:${w.soft}">
      ${topbar({ back: true, title: `${w.emoji} ${w.name}` })}
      <div class="map" style="height:${H}px">
        <svg class="map-path" viewBox="0 0 100 ${H}" preserveAspectRatio="none"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>
        ${list.map((s, i) => {
          const st = skillState(state, s.id);
          const open = isUnlocked(s.id);
          const isFront = s.id === front.id;
          const isNextLocked = !open && i > 0 && isUnlocked(list[i - 1].id);
          return `<div class="node-wrap" style="left:${xs[i]}%;top:${i * rowH + 90}px">
            <button class="node ${open ? 'open' : 'locked'} ${isFront ? 'front' : ''} ${st.crowned ? 'crowned' : ''} ${highlight === s.id ? 'flash' : ''}" data-id="${s.id}" data-next="${isNextLocked ? 1 : 0}">
              ${st.crowned ? '<span class="node-crown">👑</span>' : ''}
              <span class="node-num">${open ? i + 1 : '🔒'}</span>
            </button>
            <div class="node-stars">${open ? starsHtml(st.stars) : ''}${st.placed && st.stars === 0 ? '<span class="placed">✔︎</span>' : ''}</div>
            <div class="node-label">${esc(s.name)}</div>
            ${isFront ? `<div class="node-mascot">${mascot('happy', 80, 'bob')}</div>` : ''}
          </div>`;
        }).join('')}
      </div></div>`;
    bindTop(root);
    if (msg) { setTimeout(() => notify(msg, 'unlock'), 300); }
    const f = root.querySelector('.node.front');
    if (f) setTimeout(() => f.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200);
    root.querySelector('.map').addEventListener('click', (e) => {
      const n = e.target.closest('.node');
      if (!n) return;
      sfx('tap');
      levelCard(n.dataset.id, n.dataset.next === '1');
    });
  },

  play(session) { playScreen(app, session); },

  balloons() { balloonsScreen(app); },

  result(r) {
    const root = app.root;
    const s = r.session;
    const title = r.stars === 3 ? '¡Perfecto!' : r.stars === 2 ? '¡Muy bien!' : r.stars === 1 ? '¡Bien hecho!' : '¡Buen intento!';
    const op = s.skill ? SKILL[s.skill].op : s.kind === 'table' ? 'mul' : null;
    const unlockedNext = r.unlocked.filter((id) => !s.skill || SKILL[id].op === SKILL[s.skill].op);
    root.innerHTML = `<div class="screen result ${op ? `theme-${op}` : 'theme-magic'}">
      <div class="result-card">
        <div class="result-mascot">${mascot(r.stars >= 2 ? 'party' : 'happy', 170, 'bob')}</div>
        <h1>${title}</h1>
        <div class="big-stars">${[0, 1, 2].map((i) => `<span class="bs" data-i="${i}">★</span>`).join('')}</div>
        <div class="result-stats">
          <div><b>${r.correct}/${r.total}</b><span>bien a la primera</span></div>
          <div><b>${r.avg.toFixed(1)} s</b><span>por problema</span></div>
          <div><b>+${r.earned}</b><span>⭐ ganadas</span></div>
          <div><b>${r.bestCombo}</b><span>🔥 mejor racha</span></div>
        </div>
        ${unlockedNext.map((id) => `<div class="unlock-banner">🔓 ¡Desbloqueaste <b>${esc(SKILL[id].name)}</b>!</div>`).join('')}
        ${r.crowns.map((id) => `<div class="unlock-banner crown">👑 ¡Ganaste la corona de <b>${esc(SKILL[id].name)}</b>!</div>`).join('')}
        ${r.stars < 2 && s.kind === 'lesson' ? '<p class="result-tip">Con 2 estrellas se abre el próximo nivel. ¡Probá otra vez!</p>' : ''}
        <div class="row">
          <button class="btn btn-soft js-again">🔁 Otra vez</button>
          ${unlockedNext.length ? `<button class="btn btn-go js-next">Siguiente nivel →</button>` : `<button class="btn btn-go js-continue">Seguir →</button>`}
        </div>
      </div></div>`;
    const bs = root.querySelectorAll('.bs');
    bs.forEach((el, i) => {
      if (i < r.stars) setTimeout(() => { el.classList.add('on'); sfx('star'); const rc = el.getBoundingClientRect(); confetti({ x: rc.left + rc.width / 2, y: rc.top + rc.height / 2, count: 30, spread: 0.6 }); }, 500 + i * 450);
    });
    if (r.stars === 3) setTimeout(() => { bigCelebration(); sfx('fanfare'); }, 1900);
    say(`${title.replace(/[¡!]/g, '')} ${r.correct} de ${r.total}`);
    const again = () => app.play(s);
    root.querySelector('.js-again').addEventListener('click', again);
    root.querySelector('.js-next')?.addEventListener('click', () => app.play({ kind: 'lesson', skill: unlockedNext[0] }));
    root.querySelector('.js-continue')?.addEventListener('click', () => {
      sfx('tap');
      if (s.kind === 'lesson') app.go('world', { op: SKILL[s.skill].op, highlight: s.skill }, { push: false });
      else if (s.kind === 'table') app.go('tables', {}, { push: false });
      else app.go('home', {}, { push: false });
    });
  },

  speedResult({ op, score, prev, record, earned }) {
    const root = app.root;
    const w = WORLDS.find((x) => x.id === op);
    root.innerHTML = `<div class="screen result theme-${op}"><div class="result-card">
      <div class="result-mascot">${mascot(record ? 'party' : 'happy', 170, 'bob')}</div>
      <h1>${record ? '¡Nuevo récord!' : '¡Terminó la carrera!'}</h1>
      <div class="speed-score">${score}</div>
      <p class="result-sub">respuestas bien en ${60} segundos de ${w.short.toLowerCase()}</p>
      <div class="result-stats"><div><b>${Math.max(prev, score)}</b><span>🏆 récord</span></div><div><b>+${earned}</b><span>⭐ ganadas</span></div></div>
      <div class="row"><button class="btn btn-soft js-home">🏠 Inicio</button><button class="btn btn-go js-again">⏱️ ¡Otra carrera!</button></div>
    </div></div>`;
    if (record && score > 0) { setTimeout(() => { bigCelebration(); sfx('fanfare'); }, 300); say(`¡Nuevo récord! ${score}`); }
    root.querySelector('.js-again').addEventListener('click', () => app.play({ kind: 'speed', op }));
    root.querySelector('.js-home').addEventListener('click', () => app.go('home', {}, { push: false }));
  },

  placementResult({ result }) {
    const root = app.root;
    const rows = WORLDS.map((w) => {
      const id = result[w.id] || skillsOf(w.id)[0].id;
      return `<div class="place-row" style="--c:${w.color}"><span>${w.emoji}</span><div><b>${w.short}</b><small>Empezás en: ${esc(SKILL[id].name)}</small></div></div>`;
    }).join('');
    root.innerHTML = `<div class="screen result theme-magic"><div class="result-card">
      <div class="result-mascot">${mascot('party', 170, 'bob')}</div>
      <h1>¡Ya sé tu nivel!</h1>
      <p class="result-sub">¡Sabés un montón, ${esc(state.profile.name)}! Te preparé los mundos:</p>
      <div class="place-list">${rows}</div>
      <button class="btn btn-big btn-go js-go">¡A jugar! 🚀</button></div></div>`;
    setTimeout(() => { bigCelebration(); sfx('fanfare'); }, 300);
    root.querySelector('.js-go').addEventListener('click', () => app.go('home', {}, { push: false }));
  },

  tables() {
    const root = app.root;
    const cls = (a, b) => {
      const f = state.facts[`m${Math.min(a, b)}x${Math.max(a, b)}`];
      if (!f || !f.seen) return 'unseen';
      if (f.box >= 4) return 'mastered';
      if (f.box === 0 && f.correct < f.seen) return 'weak';
      return 'learning';
    };
    const n = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const counts = { mastered: 0, learning: 0, weak: 0, unseen: 0 };
    n.forEach((a) => n.forEach((b) => counts[cls(a, b)]++));
    root.innerHTML = `<div class="screen tables theme-mul">
      ${topbar({ back: true, title: '🔢 Mis tablas' })}
      <div class="tables-wrap">
        <div class="tgrid">
          <span class="th corner">×</span>${n.map((b) => `<span class="th">${b}</span>`).join('')}
          ${n.map((a) => `<button class="th row-h" data-t="${a}">${a}</button>${n.map((b) => `<button class="tc ${cls(a, b)}" data-a="${a}" data-b="${b}" style="--d:${(a + b) * 18}ms">${a * b}</button>`).join('')}`).join('')}
        </div>
        <aside class="tables-side">
          ${bubble('Tocá un número para ver cómo se forma, o tocá una tabla de la izquierda para practicarla.', '')}
          <div class="legend">
            <div><i class="tc mastered"></i>¡La sé! <b>${counts.mastered}</b></div>
            <div><i class="tc learning"></i>Aprendiendo <b>${counts.learning}</b></div>
            <div><i class="tc weak"></i>A practicar <b>${counts.weak}</b></div>
            <div><i class="tc unseen"></i>Sin probar <b>${counts.unseen}</b></div>
          </div>
          <div class="table-btns">${[2, 3, 4, 5, 6, 7, 8, 9].map((t) => `<button class="btn btn-table" data-t="${t}">Tabla del ${t}</button>`).join('')}</div>
        </aside>
      </div></div>`;
    bindTop(root);
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-t]');
      if (t) { app.play({ kind: 'table', table: Number(t.dataset.t) }); return; }
      const c = e.target.closest('.tc[data-a]');
      if (!c) return;
      sfx('pop');
      const a = Number(c.dataset.a), b = Number(c.dataset.b);
      const m = modal(`<div class="explain"><div class="explain-q">${a} × ${b} = <span class="ans">${a * b}</span></div>
        <div class="explain-visual">${dotArray(a, b)}</div>
        <p class="hint-text">${a} filas de ${b} puntitos. ¡Y si lo das vuelta, ${b} × ${a} da lo mismo!</p>
        <div class="row"><button class="btn btn-go js-pt">Practicar la tabla del ${a}</button></div></div>`, { cls: 'modal-explain' });
      say(`${a} por ${b}, ${a * b}`);
      m.el.querySelector('.js-pt').addEventListener('click', () => app.play({ kind: 'table', table: a }));
    });
  },

  stickers() {
    const root = app.root;
    const owned = Object.keys(state.stickers).length;
    root.innerHTML = `<div class="screen stickers">
      ${topbar({ back: true, title: '📒 Mi álbum' })}
      <section class="pack-row">
        <div class="pack js-pack ${state.stars < PACK_COST ? 'poor' : ''}"><span>🎁</span></div>
        <div>
          <h2>Sobre sorpresa</h2>
          <p>${owned}/${STICKERS.length} stickers. ¡Hay comunes, raros y <b class="legend-txt">legendarios</b>!</p>
          <button class="btn btn-go js-open" ${state.stars < PACK_COST ? 'disabled' : ''}>Abrir sobre · ${PACK_COST} ⭐</button>
          ${state.stars < PACK_COST ? `<p class="small">Te faltan ${PACK_COST - state.stars} ⭐. ¡Practicá para ganar más!</p>` : ''}
        </div>
      </section>
      <section class="album">${STICKERS.map((s) => {
        const n = state.stickers[s.id] || 0;
        return `<div class="sticker ${n ? 'have' : 'missing'} r-${s.rarity}" style="--rc:${RARITY[s.rarity].color}">
          <span class="sticker-emoji">${n ? s.emoji : '?'}</span><span class="sticker-name">${n ? esc(s.name) : '???'}</span>${n > 1 ? `<span class="sticker-n">×${n}</span>` : ''}</div>`;
      }).join('')}</section></div>`;
    bindTop(root);
    root.querySelector('.js-open')?.addEventListener('click', openPack);
    root.querySelector('.js-pack').addEventListener('click', () => { if (state.stars >= PACK_COST) openPack(); });
  },

  shop() {
    const root = app.root;
    const slots = { head: '🎩 Cabeza', face: '👓 Cara', hand: '✋ Mano' };
    root.innerHTML = `<div class="screen shop">
      ${topbar({ back: true, title: '👗 Vestí a Numi' })}
      <div class="shop-wrap">
        <div class="shop-numi">${mascot('happy', 300, 'bob')}<p class="small">Tocá algo para probártelo. ¡Lo que compres es tuyo para siempre!</p></div>
        <div class="shop-items">${Object.entries(slots).map(([slot, label]) => `<h3>${label}</h3><div class="shop-grid">
          ${OUTFITS.filter((o) => o.slot === slot).map((o) => {
            const own = state.owned[o.id];
            const worn = state.outfit[slot] === o.emoji;
            return `<button class="shop-item ${own ? 'own' : ''} ${worn ? 'worn' : ''}" data-id="${o.id}"><span>${o.emoji}</span><b>${esc(o.name)}</b>
              <small>${worn ? '✔︎ Puesto' : own ? 'Ponerme' : `${o.cost} ⭐`}</small></button>`;
          }).join('')}</div>`).join('')}</div>
      </div></div>`;
    bindTop(root);
    root.querySelector('.shop-items').addEventListener('click', (e) => {
      const b = e.target.closest('.shop-item');
      if (!b) return;
      const o = OUTFITS.find((x) => x.id === b.dataset.id);
      if (state.owned[o.id]) {
        state.outfit[o.slot] = state.outfit[o.slot] === o.emoji ? null : o.emoji;
        sfx('pop');
      } else if (state.stars >= o.cost) {
        state.stars -= o.cost;
        state.owned[o.id] = Date.now();
        state.outfit[o.slot] = o.emoji;
        sfx('coin');
        confetti({ count: 60 });
        say(`¡${o.name}!`);
      } else {
        toast(`Te faltan ${o.cost - state.stars} ⭐ para ${esc(o.name)}. ¡A practicar!`);
        return;
      }
      setOutfit(state.outfit);
      save(state);
      app.go('shop', {}, { push: false });
    });
  },

  progress() {
    const root = app.root;
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      days.push({ k, label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()], ...(state.daily[k] || { problems: 0, correct: 0 }) });
    }
    const max = Math.max(10, ...days.map((d) => d.problems));
    const acc = state.totals.problems ? Math.round((state.totals.correct / state.totals.problems) * 100) : 0;
    const chart = `<svg class="chart" viewBox="0 0 700 220" role="img" aria-label="Problemas por día">
      ${days.map((d, i) => {
        const h = (d.problems / max) * 160;
        const hc = (d.correct / max) * 160;
        const x = 12 + i * 49;
        return `<g><rect x="${x}" y="${180 - h}" width="34" height="${h}" rx="8" fill="#FFD3E0"/>
          <rect x="${x}" y="${180 - hc}" width="34" height="${hc}" rx="8" fill="#FF5D8F"/>
          ${d.problems ? `<text x="${x + 17}" y="${172 - h}" text-anchor="middle" class="ch-v">${d.problems}</text>` : ''}
          <text x="${x + 17}" y="205" text-anchor="middle" class="ch-l">${d.label}</text></g>`;
      }).join('')}</svg>`;
    root.innerHTML = `<div class="screen progress">
      ${topbar({ back: true, title: '🏅 Mis avances' })}
      <section class="stat-cards">
        <div class="stat"><b>${state.totals.correct}</b><span>problemas bien</span></div>
        <div class="stat"><b>${acc}%</b><span>de aciertos</span></div>
        <div class="stat"><b>${state.streak.best}</b><span>🔥 días seguidos (récord)</span></div>
        <div class="stat"><b>${Object.keys(state.badges).length}/${BADGES.length}</b><span>🏅 medallas</span></div>
      </section>
      <section class="panel"><h2>Últimos 14 días</h2>${chart}<p class="small"><i class="sw" style="background:#FF5D8F"></i> bien &nbsp; <i class="sw" style="background:#FFD3E0"></i> intentados</p></section>
      <section class="panel"><h2>Medallas</h2><div class="badges">${BADGES.map((b) => `<div class="badge ${state.badges[b.id] ? 'on' : ''}"><span>${b.emoji}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div></section>
      ${WORLDS.map((w) => `<section class="panel" style="--c:${w.color};--cs:${w.soft}"><h2>${w.emoji} ${w.name}</h2>
        <div class="skill-rows">${skillsOf(w.id).map((s) => {
          const st = skillState(state, s.id);
          const sp = speedOf(st);
          return `<div class="skill-row ${isUnlocked(s.id) ? '' : 'dim'}"><span class="sr-name">${esc(s.name)}</span>
            <span class="sr-bar"><i style="width:${st.mastery}%"></i></span><span class="sr-pct">${st.mastery}%</span>
            <span class="sr-speed">${sp ? `⏱️ ${sp.toFixed(1)} s` : ''}</span><span class="sr-stars">${starsHtml(st.stars)}${st.crowned ? '👑' : ''}</span></div>`;
        }).join('')}</div></section>`).join('')}
    </div>`;
    bindTop(root);
  },

  parents() {
    const root = app.root;
    const s = state.settings;
    const weak = Object.entries(state.facts)
      .filter(([k, f]) => k.startsWith('m') && f.seen >= 2)
      .sort((a, b) => a[1].box - b[1].box || a[1].correct / a[1].seen - b[1].correct / b[1].seen)
      .slice(0, 8)
      .map(([k, f]) => `<span class="chip">${k.slice(1).replace('x', ' × ')} <small>${Math.round((f.correct / f.seen) * 100)}%</small></span>`).join('') || '<span class="small">Todavía no hay datos.</span>';
    const fronts = WORLDS.map((w) => `<li>${w.emoji} <b>${w.short}:</b> ${esc(frontier(state, w.id).name)} · dominio ${skillState(state, frontier(state, w.id).id).mastery}%</li>`).join('');
    root.innerHTML = `<div class="screen parents">
      ${topbar({ back: true, title: '⚙️ Para adultos' })}
      <section class="panel"><h2>Resumen</h2>
        <ul class="plain">${fronts}</ul>
        <h3>Tablas que más le cuestan</h3><div class="chips">${weak}</div>
        <p class="small">La app sube de nivel sola cuando hay 85% de dominio (precisión + velocidad) en los últimos 12 problemas, o al terminar una lección con 2 estrellas o más. Los hechos que falla vuelven más seguido (repaso espaciado).</p>
      </section>
      <section class="panel"><h2>Ajustes</h2>
        <label class="set"><span>🔈 Sonidos</span><input type="checkbox" class="js-sound" ${s.sound ? 'checked' : ''}></label>
        <label class="set"><span>🗣️ Voz de Numi</span><input type="checkbox" class="js-voice" ${s.voice ? 'checked' : ''}></label>
        <label class="set"><span>🎙️ Voz</span><span class="voice-pick"><select class="js-voicesel"></select><button class="btn btn-soft btn-sm js-try">▶ Probar</button></span></label>
        <p class="small">En el iPad podés bajar voces más lindas (por ejemplo <b>Paulina</b> o <b>Mónica</b> “Mejorada”) en Ajustes › Accesibilidad › Contenido leído › Voces › Español. Después elegila acá.</p>
        <label class="set"><span>✏️ Responder con Apple Pencil</span><input type="checkbox" class="js-pencil" ${s.pencil ? 'checked' : ''}></label>
        <label class="set"><span>🎯 Meta diaria</span><select class="js-goal">${[10, 20, 30, 50].map((g) => `<option ${g === s.dailyGoal ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label class="set"><span>🔓 Abrir todos los niveles</span><input type="checkbox" class="js-all" ${s.unlockAll ? 'checked' : ''}></label>
        <label class="set"><span>✏️ Nombre</span><input class="js-name" value="${esc(state.profile?.name || '')}" maxlength="16"></label>
      </section>
      <section class="panel"><h2>Progreso</h2>
        <div class="row wrap">
          <button class="btn btn-soft js-place">🧭 Repetir desafío inicial</button>
          <button class="btn btn-soft js-export">💾 Guardar copia</button>
          <button class="btn btn-soft js-import">📂 Cargar copia</button>
          <button class="btn btn-danger js-reset">🗑️ Borrar todo</button>
        </div>
        <input type="file" class="js-file" accept="application/json" hidden>
      </section></div>`;
    bindTop(root);
    const $ = (q) => root.querySelector(q);
    const apply = () => { configureSound(s); save(state); };
    $('.js-sound').addEventListener('change', (e) => { s.sound = e.target.checked; apply(); });
    $('.js-voice').addEventListener('change', (e) => { s.voice = e.target.checked; apply(); });
    const fillVoices = () => {
      const vs = spanishVoices();
      const cur = currentVoice();
      $('.js-voicesel').innerHTML = `<option value="">Automática${cur ? ` (${esc(cur.name)})` : ''}</option>` +
        vs.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s.voiceURI ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('');
    };
    fillVoices();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', fillVoices);
    $('.js-voicesel').addEventListener('change', (e) => { s.voiceURI = e.target.value; apply(); });
    $('.js-try').addEventListener('click', (e) => { e.preventDefault(); say(`¡Hola ${state.profile?.name || ''}! Soy Numi. ¿Practicamos las tablas?`, { force: true }); });
    $('.js-pencil').addEventListener('change', (e) => { s.pencil = e.target.checked; apply(); });
    $('.js-goal').addEventListener('change', (e) => { s.dailyGoal = Number(e.target.value); apply(); });
    $('.js-all').addEventListener('change', (e) => { s.unlockAll = e.target.checked; apply(); });
    $('.js-name').addEventListener('change', (e) => { state.profile.name = e.target.value.trim() || state.profile.name; apply(); });
    $('.js-place').addEventListener('click', () => app.play({ kind: 'placement' }));
    $('.js-export').addEventListener('click', () => {
      const blob = new Blob([exportJson(state)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `numi-${todayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $('.js-import').addEventListener('click', () => $('.js-file').click());
    $('.js-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { state = importJson(await f.text()); save(state); configureSound(state.settings); toast('Copia cargada ✔︎'); app.go('home', {}, { push: false }); }
      catch (err) { toast('No se pudo leer el archivo'); }
    });
    $('.js-reset').addEventListener('click', () => {
      const m = modal(`<div class="center"><h2>¿Borrar todo el progreso?</h2><p>Se pierden estrellas, stickers y niveles. No se puede deshacer.</p>
        <div class="row"><button class="btn btn-soft" data-close>Cancelar</button><button class="btn btn-danger js-yes">Sí, borrar</button></div></div>`);
      m.el.querySelector('.js-yes').addEventListener('click', () => { state = reset(); configureSound(state.settings); m.close(); history.length = 0; app.go('onboarding', {}, { push: false }); });
    });
  },
};

function levelCard(id, isNextLocked) {
  const s = SKILL[id];
  const st = skillState(state, id);
  const w = WORLDS.find((x) => x.id === s.op);
  const open = isUnlocked(id);
  const sp = speedOf(st);
  let body;
  if (open) {
    body = `<div class="lc-stars">${starsHtml(st.stars)}</div>
      <div class="lc-stats"><div><b>${st.mastery}%</b><span>dominio</span></div><div><b>${sp ? sp.toFixed(1) + ' s' : '—'}</b><span>velocidad</span></div><div><b>${st.crowned ? '👑' : '—'}</b><span>corona</span></div></div>
      <p class="small">${st.crowned ? '¡Ya lo dominás! Podés practicarlo para no olvidarte.' : 'Respondé bien y rápido para ganar la corona 👑'}</p>
      <button class="btn btn-big btn-go js-play">¡Jugar! ▶</button>`;
  } else if (isNextLocked) {
    body = `<p>Para abrir este nivel conseguí 2 estrellas en el anterior.</p>
      <p><b>¿Ya lo sabés?</b> Hacé la <b>prueba de salto</b>: 5 preguntas, ¡todas bien!</p>
      <button class="btn btn-big btn-jump js-jump">⚡ Prueba de salto</button>`;
  } else {
    body = '<p>Este nivel todavía está cerrado. ¡Pasá los niveles anteriores para llegar acá!</p>';
  }
  const m = modal(`<div class="level-card" style="--c:${w.color};--cd:${w.dark};--cs:${w.soft}">
    <div class="lc-head"><span>${w.emoji}</span><h2>${esc(s.name)}</h2></div>${body}</div>`);
  m.el.querySelector('.js-play')?.addEventListener('click', () => app.play({ kind: 'lesson', skill: id }));
  m.el.querySelector('.js-jump')?.addEventListener('click', () => app.play({ kind: 'jump', skill: id }));
}

function openChest() {
  if (state.lastChest === todayKey()) return;
  const prize = 5 + Math.floor(Math.random() * 11) + Math.min(10, state.streak.current * 2);
  state.lastChest = todayKey();
  state.stars += prize;
  save(state);
  sfx('whoosh');
  const m = modal(`<div class="pack-open"><div class="pack-big shaking">🎁</div>
    <div class="reveal r-legend" style="--rc:#FFC93C" hidden><div class="rays"></div><div class="reveal-emoji">⭐</div>
    <h2>¡+${prize} estrellas!</h2><p class="rarity">${state.streak.current > 1 ? `Bonus por ${state.streak.current} días seguidos 🔥` : '¡Volvé mañana por otro cofre!'}</p>
    <button class="btn btn-big btn-go" data-close>¡Gracias!</button></div></div>`,
  { cls: 'modal-pack', dismissable: false, onClose: () => app.go('home', {}, { push: false }) });
  setTimeout(() => { m.el.querySelector('.pack-big').remove(); m.el.querySelector('.reveal').hidden = false; sfx('fanfare'); bigCelebration(); }, 1300);
}

function speedPicker() {
  sfx('tap');
  const m = modal(`<div class="center"><h2>⏱️ Carrera contra el reloj</h2><p>¿Cuántas podés hacer en 60 segundos?</p>
    <div class="speed-picks">${WORLDS.map((w) => `<button class="speed-pick" data-op="${w.id}" style="--c:${w.color};--cd:${w.dark}">
      <span>${w.emoji}</span><b>${w.short}</b><small>🏆 ${state.records[`speed_${w.id}`] || 0}</small></button>`).join('')}</div></div>`);
  m.el.querySelector('.speed-picks').addEventListener('click', (e) => {
    const b = e.target.closest('.speed-pick');
    if (b) app.play({ kind: 'speed', op: b.dataset.op });
  });
}

function rollSticker() {
  const r = Math.random();
  const rarity = r < RARITY.legend.chance ? 'legend' : r < RARITY.legend.chance + RARITY.rare.chance ? 'rare' : 'common';
  const pool = STICKERS.filter((s) => s.rarity === rarity);
  // un poco más de chance de los que no tiene
  const missing = pool.filter((s) => !state.stickers[s.id]);
  const from = missing.length && Math.random() < 0.6 ? missing : pool;
  return from[Math.floor(Math.random() * from.length)];
}

function openPack() {
  if (state.stars < PACK_COST) return;
  state.stars -= PACK_COST;
  state.totals.packs++;
  const s = rollSticker();
  const isNew = !state.stickers[s.id];
  state.stickers[s.id] = (state.stickers[s.id] || 0) + 1;
  if (!isNew) state.stars += 3;
  save(state);
  sfx('whoosh');
  const m = modal(`<div class="pack-open">
      <div class="pack-big shaking">🎁</div>
      <div class="reveal r-${s.rarity}" style="--rc:${RARITY[s.rarity].color}" hidden>
        <div class="rays"></div>
        <div class="reveal-emoji">${s.emoji}</div>
        <h2>${esc(s.name)}</h2>
        <p class="rarity">${RARITY[s.rarity].name}${isNew ? ' · ¡NUEVO!' : ' · repetido (+3⭐)'}</p>
        <button class="btn btn-big btn-go" data-close>¡Genial!</button>
      </div></div>`, { cls: 'modal-pack', dismissable: false, onClose: () => { app.checkBadges(); app.go('stickers', {}, { push: false }); } });
  setTimeout(() => {
    m.el.querySelector('.pack-big').remove();
    m.el.querySelector('.reveal').hidden = false;
    sfx(s.rarity === 'common' ? 'star' : 'fanfare');
    if (s.rarity === 'legend') bigCelebration(); else confetti({ count: s.rarity === 'rare' ? 120 : 70 });
    say(`¡${s.name}!`);
  }, 1300);
}

// ---------- arranque ----------
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('pointerdown', unlockAudio, { once: true });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

app.go(state.profile ? 'home' : 'onboarding', {}, { push: false });
window.__app = app; // para depurar
