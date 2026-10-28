export const AVATARS = ['🦄', '🐱', '🐼', '🦊', '🐸', '🐧', '🦁', '🐰', '🐨', '🐙', '🦋', '🐬'];

export const PRAISE = ['¡Genial!', '¡Muy bien!', '¡Excelente!', '¡Bravo!', '¡Increíble!', '¡Sos una genia!', '¡Perfecto!', '¡Bien ahí!', '¡Espectacular!', '¡Así se hace!'];
export const COMBO_PRAISE = ['¡Estás on fire!', '¡Imparable!', '¡Qué racha!', '¡Súper cerebro!'];
export const OOPS = ['¡Casi!', 'Uy, no fue esa', '¡Ups! Veamos juntas', 'No pasa nada, ¡aprendemos!'];

export const RARITY = {
  common: { name: 'Común', color: '#7DD3FC', chance: 0.68 },
  rare: { name: 'Rara', color: '#C084FC', chance: 0.27 },
  legend: { name: 'Legendaria', color: '#FBBF24', chance: 0.05 },
};

export const STICKERS = [
  // comunes
  ['s_cat', '🐱', 'Michi', 'common'], ['s_dog', '🐶', 'Firulais', 'common'], ['s_bunny', '🐰', 'Conejita', 'common'],
  ['s_panda', '🐼', 'Panda', 'common'], ['s_frog', '🐸', 'Sapito', 'common'], ['s_chick', '🐥', 'Pollito', 'common'],
  ['s_bee', '🐝', 'Abejita', 'common'], ['s_turtle', '🐢', 'Tortuga', 'common'], ['s_fish', '🐠', 'Pececito', 'common'],
  ['s_straw', '🍓', 'Frutilla', 'common'], ['s_ice', '🍦', 'Helado', 'common'], ['s_donut', '🍩', 'Dona', 'common'],
  ['s_flower', '🌸', 'Flor', 'common'], ['s_sun', '🌞', 'Sol', 'common'], ['s_rainbow', '🌈', 'Arcoíris', 'common'],
  ['s_cookie', '🍪', 'Galletita', 'common'],
  // raras
  ['s_rocket', '🚀', 'Cohete', 'rare'], ['s_planet', '🪐', 'Planeta', 'rare'], ['s_octo', '🐙', 'Pulpo', 'rare'],
  ['s_owl', '🦉', 'Búho sabio', 'rare'], ['s_dolphin', '🐬', 'Delfín', 'rare'], ['s_butterfly', '🦋', 'Mariposa', 'rare'],
  ['s_peacock', '🦚', 'Pavo real', 'rare'], ['s_cake', '🎂', 'Torta', 'rare'], ['s_crown', '👑', 'Corona', 'rare'],
  ['s_robot', '🤖', 'Robot', 'rare'],
  // legendarias
  ['s_unicorn', '🦄', 'Unicornio', 'legend'], ['s_dragon', '🐉', 'Dragón', 'legend'], ['s_star', '🌟', 'Estrella mágica', 'legend'],
  ['s_gem', '💎', 'Diamante', 'legend'],
].map(([id, emoji, name, rarity]) => ({ id, emoji, name, rarity }));

export const PACK_COST = 15;

// Medallas: cada una tiene una condición sobre el estado.
export const BADGES = [
  { id: 'first', emoji: '🌱', name: 'Primer paso', desc: 'Respondé tu primer problema', test: (s) => s.totals.correct >= 1 },
  { id: 'lesson1', emoji: '📘', name: 'Primera lección', desc: 'Terminá una lección', test: (s) => s.totals.lessons >= 1 },
  { id: 'perfect', emoji: '💯', name: '¡Perfecto!', desc: 'Una lección sin errores', test: (s) => s.totals.perfect >= 1 },
  { id: 'combo10', emoji: '🔥', name: 'Racha de 10', desc: '10 respuestas bien seguidas', test: (s) => s.totals.bestCombo >= 10 },
  { id: 'combo25', emoji: '☄️', name: 'Racha de 25', desc: '25 respuestas bien seguidas', test: (s) => s.totals.bestCombo >= 25 },
  { id: 'p100', emoji: '💪', name: '100 problemas', desc: 'Resolvé 100 problemas', test: (s) => s.totals.correct >= 100 },
  { id: 'p500', emoji: '🧠', name: '500 problemas', desc: 'Resolvé 500 problemas', test: (s) => s.totals.correct >= 500 },
  { id: 'p1000', emoji: '🏆', name: '¡1000 problemas!', desc: 'Resolvé 1000 problemas', test: (s) => s.totals.correct >= 1000 },
  { id: 'crown1', emoji: '👑', name: 'Primera corona', desc: 'Dominá un nivel con velocidad', test: (s) => Object.values(s.skills).some((k) => k.crowned) },
  { id: 'streak3', emoji: '📅', name: '3 días seguidos', desc: 'Practicá 3 días seguidos', test: (s) => s.streak.best >= 3 },
  { id: 'streak7', emoji: '🗓️', name: 'Una semana', desc: 'Practicá 7 días seguidos', test: (s) => s.streak.best >= 7 },
  { id: 'speed15', emoji: '⚡', name: 'Rayo', desc: '15 en una carrera', test: (s) => Object.values(s.records).some((r) => r >= 15) },
  { id: 'speed30', emoji: '🌪️', name: 'Tornado', desc: '30 en una carrera', test: (s) => Object.values(s.records).some((r) => r >= 30) },
  { id: 'mulstart', emoji: '✖️', name: 'A multiplicar', desc: 'Pasá la tabla del 5', test: (s) => (s.skills.mul2?.stars || 0) >= 2 },
  { id: 'tables', emoji: '🧙‍♀️', name: 'Maga de las tablas', desc: 'Pasá todas las tablas', test: (s) => (s.skills.mul9?.stars || 0) >= 2 },
  { id: 'stickers10', emoji: '📒', name: 'Coleccionista', desc: 'Juntá 10 stickers distintos', test: (s) => Object.keys(s.stickers).length >= 10 },
  { id: 'legend', emoji: '🌟', name: '¡Legendaria!', desc: 'Conseguí un sticker legendario', test: (s) => STICKERS.some((k) => k.rarity === 'legend' && s.stickers[k.id]) },
];
