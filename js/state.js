'use strict';
/* =====================================================================
 * 2. STATE
 * ===================================================================== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = CONFIG.world.width;
const H = CONFIG.world.height;
const GROUND_Y = H - CONFIG.world.groundHeight;
const TAU = Math.PI * 2;
const MUTE_BTN = { x: W - 30, y: 30, r: 18 };
const PAUSE_BTN = { x: W - 74, y: 30, r: 18 };
const TROPHY_BTN = { x: 30, y: 30, r: 18 };
const SKIN_ARROWS = { left: { x: 58, y: 260, r: 16 }, right: { x: 162, y: 260, r: 16 } };
const hitCircle = (x, y, c, pad) => Math.hypot(x - c.x, y - c.y) <= c.r + pad;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);

let state;                 // everything that resets on restart (see resetGame)
let bests = {};            // best score per difficulty (kept in memory even if storage fails)
let difficulty = CONFIG.difficulty.initial; // selected preset key
let lastTs = null;         // previous frame timestamp
const input = { spaceHeld: false };
const world = { clouds: [], stars: [], groundOff: 0, farOff: 0, nearOff: 0 };
const theme = { cur: {}, rgb: {}, stars: 0, moon: 0, bodyY: 95 };

// Pre-parse every theme's colours to RGB triples for blending.
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const THEMES = CONFIG.levels.themes;
const THEME_RGB = THEMES.map((t) => {
  const o = {};
  for (const k in t.colors) o[k] = hexToRgb(t.colors[k]);
  return o;
});
const DIFF_KEYS = Object.keys(CONFIG.difficulty.presets);
const preset = () => CONFIG.difficulty.presets[difficulty];

function themeIndexFor(score) {
  const L = CONFIG.levels;
  return L.enabled ? Math.floor(score / L.pointsPerLevel) % THEMES.length : 0;
}
// Jump straight to theme 0 (used on restart).
function snapTheme() {
  const t = THEME_RGB[0];
  for (const k in t) theme.rgb[k] = t[k].slice();
  theme.stars = THEMES[0].stars;
  theme.moon = THEMES[0].body === 'moon' ? 1 : 0;
  theme.bodyY = THEMES[0].bodyY;
}

function readInt(key) {
  try { const v = parseInt(localStorage.getItem(key), 10); return Number.isFinite(v) && v > 0 ? v : 0; }
  catch (e) { return 0; }
}
function loadBests() {
  const o = {};
  for (const k of DIFF_KEYS) o[k] = CONFIG.storage.enabled ? readInt(CONFIG.storage.key + '.' + k) : 0;
  if (CONFIG.storage.enabled && !o.normal) o.normal = readInt(CONFIG.storage.key); // older single best
  return o;
}
function saveBest() {
  if (!CONFIG.storage.enabled) return;
  try { localStorage.setItem(CONFIG.storage.key + '.' + difficulty, String(bests[difficulty])); } catch (e) { /* session-only best */ }
}
function loadDifficulty() {
  if (CONFIG.storage.enabled) {
    try {
      const v = localStorage.getItem(CONFIG.storage.difficultyKey);
      if (v && CONFIG.difficulty.presets[v]) return v;
    } catch (e) { /* ignore */ }
  }
  return CONFIG.difficulty.presets[CONFIG.difficulty.initial] ? CONFIG.difficulty.initial : DIFF_KEYS[0];
}
function saveDifficulty() {
  if (!CONFIG.storage.enabled) return;
  try { localStorage.setItem(CONFIG.storage.difficultyKey, difficulty); } catch (e) { /* session-only */ }
}
function loadMuted() {
  if (!CONFIG.storage.enabled) return false;
  try { return localStorage.getItem(CONFIG.storage.muteKey) === '1'; } catch (e) { return false; }
}
function saveMuted(m) {
  if (!CONFIG.storage.enabled) return;
  try { localStorage.setItem(CONFIG.storage.muteKey, m ? '1' : '0'); } catch (e) { /* session-only mute */ }
}

// Resets EVERYTHING that belongs to a run: bird, pipes, score, difficulty, theme, particles.
function resetGame() {
  const B = CONFIG.bird;
  state = {
    mode: 'start',           // 'start' | 'playing' | 'paused' | 'gameover'
    time: 0,
    score: 0,
    speed: preset().baseSpeed,
    bird: { x: B.x, y: B.startY, vy: 0, rot: 0, wingP: 1, wingAngle: 0 },
    pipes: [],
    particles: [],
    lastGapCenter: B.startY,
    shake: 0, flash: 0, scorePop: 0, countdown: 0,
    deathTime: 0, newBest: false, medal: null,
    level: 1, banner: 0,
    fx: { shield: false, invuln: 0, slow: 0, double: 0 }, speedMult: 1,
    picked: 0, shieldSaves: 0, sincePower: 0,
    trail: [], trailTimer: 0, panel: null
  };
  snapTheme();
  initWorld();
}

function initWorld() {
  world.groundOff = world.farOff = world.nearOff = 0;
  world.ambient = [];
  world.ambientAcc = 0;
  world.clouds = [];
  for (let i = 0; i < 6; i++) {
    const s = rand(0.6, 1.3);
    world.clouds.push({ x: rand(0, W), y: rand(30, 220), s, depth: 0.08 + s * 0.1 });
  }
  world.stars = [];
  for (let i = 0; i < 45; i++) {
    world.stars.push({ x: rand(0, W), y: rand(8, 300), r: rand(0.6, 1.6), ph: rand(0, TAU) });
  }
}
