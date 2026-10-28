import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILLS, SKILL, generate, makeProblem, makeChoices, recordAnswer, finishLesson, Placement,
  computeMastery, buildLesson, buildSmart, levelFromXp, nextSkill, skillState, compute,
} from '../js/engine.js';
import { defaultState } from '../js/store.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const units = (n) => n % 10;
const tens = (n) => Math.floor(n / 10) % 10;

test('cada nivel genera problemas válidos', () => {
  const state = defaultState();
  for (const s of SKILLS) {
    for (let i = 0; i < 400; i++) {
      const p = generate(state, s.id, 'input');
      assert.ok(Number.isInteger(p.a) && Number.isInteger(p.b), `${s.id} enteros`);
      assert.ok(Number.isInteger(p.c) && p.c >= 0, `${s.id} resultado entero no negativo: ${p.a},${p.b}`);
      assert.equal(p.c, compute(s.op, p.a, p.b));
    }
  }
});

test('restricciones de cada nivel', () => {
  const state = defaultState();
  const many = (id) => Array.from({ length: 500 }, () => generate(state, id, 'input'));
  for (const p of many('add1')) assert.ok(p.c <= 5);
  for (const p of many('add2')) assert.ok(p.c <= 10);
  for (const p of many('add3')) assert.ok(p.c <= 20);
  for (const p of many('add5')) { assert.ok(units(p.a) + units(p.b) <= 9); assert.ok(p.c < 100); }
  for (const p of many('add6')) { assert.ok(units(p.a) + units(p.b) >= 10); assert.ok(p.c < 100); }
  for (const p of many('sub1')) assert.ok(p.a <= 5 && p.c >= 0);
  for (const p of many('sub5')) { assert.ok(units(p.a) >= units(p.b)); assert.ok(p.c > 0); }
  for (const p of many('sub6')) { assert.ok(units(p.a) < units(p.b)); assert.ok(tens(p.a) > tens(p.b)); }
  for (const p of many('mul3')) assert.ok(p.a === 3 || p.b === 3);
  for (const p of many('div2')) assert.ok(p.b === 3 || p.b === 4);
});

test('opciones: 4 distintas, incluyen la respuesta y no hay negativas', () => {
  const state = defaultState();
  for (const s of SKILLS) {
    for (let i = 0; i < 200; i++) {
      const p = generate(state, s.id, 'choice');
      assert.equal(p.choices.length, 4);
      assert.equal(new Set(p.choices).size, 4);
      assert.ok(p.choices.includes(p.answer));
      assert.ok(p.choices.every((v) => v >= 0 && Number.isInteger(v)));
    }
  }
  const p = makeProblem('add1', 1, 0, 'choice');
  assert.equal(makeChoices(p).length, 4);
});

test('formato "missing" pide el segundo número', () => {
  const p = makeProblem('mul3', 3, 7, 'missing');
  assert.equal(p.answer, 7);
  assert.equal(p.c, 21);
});

test('dominio sube con respuestas correctas y rápidas, pero practicar no salta de nivel', () => {
  const state = defaultState();
  assert.equal(skillState(state, 'mul1').unlocked, true);
  for (let i = 0; i < 30; i++) {
    const ev = recordAnswer(state, generate(state, 'mul1', 'input'), true, 1500);
    assert.ok(!ev.some((e) => e.type === 'unlock'), 'no se abre el siguiente solo por responder');
  }
  assert.ok(skillState(state, 'mul1').mastery >= 90);
  assert.ok(skillState(state, 'mul1').crowned);
  assert.equal(skillState(state, 'mul2').unlocked, false);
});

test('respuestas lentas o incorrectas no coronan', () => {
  const state = defaultState();
  for (let i = 0; i < 14; i++) recordAnswer(state, generate(state, 'add1', 'input'), i % 3 !== 0, 9000);
  const st = skillState(state, 'add1');
  assert.ok(st.mastery < 85, `mastery ${st.mastery}`);
  assert.equal(st.crowned, false);
});

test('computeMastery con pocos datos es bajo', () => {
  const st = { recent: [{ ok: true, t: 1000 }] };
  assert.ok(computeMastery(st, SKILL.add1) <= 10);
});

test('hacen falta varias lecciones con 2+ estrellas para abrir el siguiente nivel', () => {
  const state = defaultState();
  let r = finishLesson(state, 'add1', 8, 10);
  assert.equal(r.stars, 2);
  assert.equal(skillState(state, 'add2').unlocked, false);
  finishLesson(state, 'add1', 3, 10); // 0 estrellas: no cuenta
  assert.equal(skillState(state, 'add2').unlocked, false);
  r = finishLesson(state, 'add1', 10, 10);
  assert.ok(skillState(state, 'add2').unlocked);
  assert.ok(r.events.some((e) => e.type === 'unlock' && e.skill === 'add2'));
});

test('los niveles de sumas llevando piden 4 lecciones y llevan de verdad', () => {
  const state = defaultState();
  for (const id of ['add5c', 'add6', 'add6b']) assert.equal(SKILL[id].need, 4);
  for (let i = 0; i < 400; i++) {
    const p = generate(state, 'add5c', 'input');
    assert.ok(p.b < 10 && (p.a % 10) + p.b >= 10 && p.c < 100, `${p.a}+${p.b}`);
    const q = generate(state, 'add6c', 'input');
    assert.ok((q.a % 10) + (q.b % 10) >= 10 && q.c >= 100 && q.c < 200, `${q.a}+${q.b}`);
  }
  const order = SKILLS.filter((s) => s.op === 'add').map((s) => s.id);
  assert.deepEqual(order, ['add1', 'add2', 'add3', 'add4', 'add5', 'add5c', 'add6', 'add6b', 'add6c', 'add7']);
});

test('ningún nivel usa "el número que falta"', () => {
  const state = defaultState();
  for (const s of SKILLS) {
    skillState(state, s.id).attempts = 50;
    for (let i = 0; i < 200; i++) assert.notEqual(generate(state, s.id).format, 'missing', s.id);
  }
});

test('niveles nuevos en el medio se abren si ya pasó por ahí', async () => {
  const { normalizeUnlocks } = await import('../js/engine.js');
  const state = defaultState();
  skillState(state, 'add6').unlocked = true;
  normalizeUnlocks(state);
  assert.ok(skillState(state, 'add5c').unlocked);
  assert.ok(skillState(state, 'add5').unlocked);
  assert.equal(skillState(state, 'add6b').unlocked, false);
});

test('lección sin repetidos', () => {
  const state = defaultState();
  const l = buildLesson(state, 'mul9', 10);
  assert.equal(l.length, 10);
  assert.equal(new Set(l.map((p) => `${p.a},${p.b}`)).size, 10);
});

test('práctica mágica solo usa niveles desbloqueados', () => {
  const state = defaultState();
  const l = buildSmart(state, 50);
  for (const p of l) assert.ok(skillState(state, p.skill).unlocked);
});

test('repaso espaciado: hechos errados aparecen más', () => {
  const state = defaultState();
  for (let x = 1; x <= 10; x++) {
    state.facts[`m${Math.min(3, x)}x${Math.max(3, x)}`] = { box: 5, seen: 5, correct: 5, last: 0 };
  }
  state.facts['m3x7'] = { box: 0, seen: 5, correct: 1, last: 0 };
  let hits = 0;
  for (let i = 0; i < 2000; i++) {
    const p = generate(state, 'mul3', 'input');
    if (p.factKey === 'm3x7') hits++;
  }
  // con peso 6 vs 0.6 debería aparecer bastante más que 1/10
  assert.ok(hits / 2000 > 0.3, `ratio ${hits / 2000}`);
});

test('desafío inicial: una nena que sabe todo llega lejos', () => {
  const state = defaultState();
  const pl = new Placement(state);
  let p;
  let n = 0;
  while ((p = pl.current()) && n++ < 100) pl.answer(p, true, 1000);
  assert.ok(pl.done);
  const res = pl.apply();
  assert.equal(res.mul, 'mul10');
  assert.ok(skillState(state, 'mul9').unlocked);
  assert.ok(skillState(state, 'add7').unlocked);
  assert.ok(skillState(state, 'div4').unlocked);
});

test('desafío inicial: solo sumas simples', () => {
  const state = defaultState();
  const pl = new Placement(state);
  let p;
  let n = 0;
  while ((p = pl.current()) && n++ < 100) {
    const ok = p.skill === 'add2';
    pl.answer(p, ok, 2000);
  }
  const res = pl.apply();
  assert.equal(res.add, 'add3');
  assert.equal(skillState(state, 'add4').unlocked, false);
  assert.equal(skillState(state, 'mul2').unlocked, false);
});

test('niveles de XP', () => {
  assert.deepEqual(levelFromXp(0), { level: 1, into: 0, need: 100 });
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(240).level, 3);
});

test('nextSkill', () => {
  assert.equal(nextSkill('add1').id, 'add2');
  assert.equal(nextSkill('add7'), null);
});

test('la carrera usa hechos rápidos y no cuentas largas', async () => {
  const { speedSkill } = await import('../js/engine.js');
  const state = defaultState();
  for (const id of ['mul1', 'mul2', 'mul3', 'mul9', 'mul10']) skillState(state, id).unlocked = true;
  for (let i = 0; i < 300; i++) assert.notEqual(speedSkill(state, 'mul'), 'mul10');
});

test('explicaciones: resta pidiendo prestado a través de un cero', async () => {
  const { explain } = await import('../js/visuals.js');
  const p = makeProblem('sub7', 503, 127, 'input');
  const html = explain(p).html;
  assert.match(html, /376/);
  assert.match(html, /9 − 2 = 7/);
  assert.match(html, /4 − 1 = 3/);
});

test('en sumas no hay "número que falta": se practican sumas, no ecuaciones', () => {
  const state = defaultState();
  for (const s of SKILLS.filter((k) => k.op === 'add')) {
    const st = skillState(state, s.id);
    st.attempts = 40; // ya practicado: es cuando antes aparecía 'missing'
    for (let i = 0; i < 300; i++) assert.notEqual(generate(state, s.id).format, 'missing', s.id);
  }
});
