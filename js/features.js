'use strict';
/* =====================================================================
 * FEATURES  (bird skins, power-ups, achievements + their persistence)
 * ===================================================================== */
let skinIndex = 0;                 // index into CONFIG.skins.list
const achieved = new Set();        // unlocked achievement ids
const stats = { games: 0 };        // lifetime stats
const toasts = [];                 // achievement toasts waiting to be shown

/* ---- safe storage helpers (never throw) ---- */
function lsGet(key) {
  if (!CONFIG.storage.enabled) return null;
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function lsSet(key, val) {
  if (!CONFIG.storage.enabled) return;
  try { localStorage.setItem(key, val); } catch (e) { /* session-only */ }
}

/* ---- skins ---- */
const skinList = () => CONFIG.skins.list;
function skinUnlocked(sk) {
  return !sk.unlock || !CONFIG.achievements.enabled || achieved.has(sk.unlock);
}
function currentSkin() {
  const list = skinList();
  return (CONFIG.skins.enabled && list[skinIndex]) || list[0];
}
function skinChoices() {
  return CONFIG.skins.enabled ? skinList().filter(skinUnlocked).length : 1;
}
function loadSkin() {
  const id = lsGet(CONFIG.storage.skinKey);
  const i = skinList().findIndex((s) => s.id === id);
  skinIndex = i >= 0 && skinUnlocked(skinList()[i]) ? i : 0;
}
// Cycle to the next/previous unlocked skin (start screen only).
function stepSkin(dir) {
  if (state.mode !== 'start' || !CONFIG.skins.enabled) return;
  const list = skinList();
  let i = skinIndex;
  for (let n = 0; n < list.length; n++) {
    i = (i + dir + list.length) % list.length;
    if (skinUnlocked(list[i])) {
      skinIndex = i;
      lsSet(CONFIG.storage.skinKey, list[i].id);
      return;
    }
  }
}

/* ---- achievements ---- */
function loadProgress() {
  try {
    const a = JSON.parse(lsGet(CONFIG.storage.achKey) || '[]');
    if (Array.isArray(a)) a.forEach((id) => achieved.add(id));
    const s = JSON.parse(lsGet(CONFIG.storage.statsKey) || '{}');
    stats.games = Number(s.games) || 0;
  } catch (e) { /* ignore corrupt data */ }
}
function saveProgress() {
  lsSet(CONFIG.storage.achKey, JSON.stringify(Array.from(achieved)));
  lsSet(CONFIG.storage.statsKey, JSON.stringify(stats));
}

function togglePanel() {
  if (state.mode === 'start' && CONFIG.achievements.enabled) state.panel = state.panel ? null : 'ach';
}

// Call after anything that could unlock something (score, pickup, shield save, game over).
function checkAchievements() {
  const A = CONFIG.achievements;
  if (!A.enabled) return;
  const S = state;
  let changed = false;
  for (const a of A.list) {
    if (achieved.has(a.id)) continue;
    let ok = false;
    switch (a.kind) {
      case 'score':       ok = S.score >= a.target; break;
      case 'level':       ok = S.level >= a.target; break;
      case 'hardScore':   ok = difficulty === 'hard' && S.score >= a.target; break;
      case 'powerups':    ok = S.picked >= a.target; break;
      case 'shieldSave':  ok = S.shieldSaves >= a.target; break;
      case 'games':       ok = stats.games >= a.target; break;
    }
    if (!ok) continue;
    achieved.add(a.id);
    changed = true;
    const reward = CONFIG.skins.enabled ? skinList().find((s) => s.unlock === a.id) : null;
    toasts.push({
      title: reward ? 'ACHIEVEMENT - SKIN UNLOCKED' : 'ACHIEVEMENT UNLOCKED',
      name: reward ? a.name + ': ' + reward.name : a.name,
      life: A.toastSeconds, max: A.toastSeconds
    });
  }
  if (changed) { saveProgress(); Sfx.achievement(); }
}

/* ---- power-ups ---- */
const scoreValue = () => (state.fx.double > 0 ? 2 : 1);
function pickPowerType() {
  const t = CONFIG.powerups.types;
  return t[Math.floor(Math.random() * t.length)];
}
// Where a pipe's pickup floats (centre of the gap, gently bobbing).
function powerPos(p) {
  return { x: p.x + CONFIG.pipes.width / 2, y: (p.top + p.bot) / 2 + Math.sin(state.time * 4 + p.x * 0.02) * 4 };
}

function updatePowerups(dt) {
  const S = state, PU = CONFIG.powerups, fx = S.fx, b = S.bird;
  if (fx.invuln > 0) fx.invuln = Math.max(0, fx.invuln - dt);
  if (fx.slow > 0) fx.slow = Math.max(0, fx.slow - dt);
  if (fx.double > 0) fx.double = Math.max(0, fx.double - dt);
  // Slow-mo eases pipe/world speed down and back up.
  const target = fx.slow > 0 ? PU.slowFactor : 1;
  const step = 1.5 * dt;
  S.speedMult += clamp(target - S.speedMult, -step, step);

  for (const p of S.pipes) {
    if (!p.power || p.power.taken) continue;
    const c = powerPos(p);
    if (Math.hypot(c.x - b.x, c.y - b.y) < PU.pickupRadius + CONFIG.bird.hitboxRadius) collectPower(p, c);
  }
}

function collectPower(p, c) {
  const S = state, PU = CONFIG.powerups, type = p.power.type;
  p.power.taken = true;
  if (type === 'shield') S.fx.shield = true;
  else if (type === 'slow') S.fx.slow = PU.slowSeconds;
  else if (type === 'double') S.fx.double = PU.doubleSeconds;
  S.picked++;
  emitSparkle(c.x, c.y, PU.colors[type], 12);
  Sfx.power();
  checkAchievements();
}

// Returns true when a collision is absorbed (shield or grace period); false means the run ends.
function absorbHit(kind) {
  const S = state, fx = S.fx, b = S.bird, B = CONFIG.bird;
  if (!fx.shield && fx.invuln <= 0) return false;
  if (kind === 'ground') { b.y = GROUND_Y - B.hitboxRadius; b.vy = B.flapVelocity; } // bounce off the ground
  else if (kind === 'ceiling') b.vy = Math.max(b.vy, 0);
  if (fx.shield && fx.invuln <= 0) {                 // spend the shield, start the grace period
    fx.shield = false;
    fx.invuln = CONFIG.powerups.shieldGrace;
    S.shieldSaves++;
    emitSparkle(b.x, b.y, CONFIG.powerups.colors.shield, 16);
    Sfx.shieldBreak();
    checkAchievements();
  }
  return true;
}
