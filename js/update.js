'use strict';
/* =====================================================================
 * 5. UPDATE
 * ===================================================================== */
function update(dt) {
  const S = state;
  if (S.mode === 'paused') return; // freeze everything
  if (S.countdown > 0) { S.countdown = Math.max(0, S.countdown - dt); return; } // resume countdown: world stays frozen
  S.time += dt;
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt);
  if (S.flash > 0) S.flash = Math.max(0, S.flash - dt);
  if (S.scorePop > 0) S.scorePop = Math.max(0, S.scorePop - dt);
  if (S.banner > 0) S.banner = Math.max(0, S.banner - dt);
  if (toasts.length && (toasts[0].life -= dt) <= 0) toasts.shift();

  if (S.mode === 'start') updateStart(dt);
  else if (S.mode === 'playing') updatePlaying(dt);
  else if (S.mode === 'gameover') updateGameOver(dt);

  updateParticles(dt);
  updateAmbient(dt);
  updateTrail(dt);
  updateTheme(dt);
}

function updateStart(dt) {
  const B = CONFIG.bird, b = state.bird;
  scrollWorld(dt, CONFIG.world.idleScrollSpeed);
  const s = Math.sin(state.time * B.bobSpeed);
  b.y = B.startY + s * B.bobAmplitude;
  b.rot = s * 0.08;
  updateWing(dt, true);
}

function updatePlaying(dt) {
  const S = state, B = CONFIG.bird, P = CONFIG.pipes, b = S.bird;

  // Difficulty: ease speed toward its current target.
  const step = CONFIG.difficulty.speedAcceleration * dt;
  S.speed += clamp(targetSpeed(S.score) - S.speed, -step, step);
  updatePowerups(dt);
  const v = S.speed * S.speedMult; // effective world speed (slow-mo power-up)
  scrollWorld(dt, v);

  // Bird physics.
  b.vy = Math.min(b.vy + B.gravity * dt, B.maxFallSpeed);
  b.y += b.vy * dt;
  updateTilt(dt);
  updateWing(dt, false);

  // Pipes: move, spawn, score, cull.
  for (let i = 0; i < S.pipes.length; i++) S.pipes[i].x -= v * dt;
  spawnPipes();
  for (let i = 0; i < S.pipes.length; i++) {
    const p = S.pipes[i];
    if (!p.passed && p.x + P.width / 2 < b.x) { p.passed = true; addScore(scoreValue()); }
  }
  while (S.pipes.length && S.pipes[0].x + P.width + P.capOverhang < 0) S.pipes.shift();

  const hit = checkCollisions();
  if (hit && !absorbHit(hit)) die();
}

function updateGameOver(dt) {
  const S = state, B = CONFIG.bird, b = S.bird;
  S.deathTime += dt;
  if (b.y + B.hitboxRadius < GROUND_Y) { // bird tumbles to the ground after dying
    b.vy = Math.min(b.vy + B.gravity * dt, B.maxFallSpeed);
    b.y += b.vy * dt;
    if (b.y + B.hitboxRadius >= GROUND_Y) { b.y = GROUND_Y - B.hitboxRadius; b.vy = 0; }
  }
  updateTilt(dt);
}

function updateTilt(dt) {
  const B = CONFIG.bird, b = state.bird;
  const target = state.mode === 'gameover' ? B.tiltDown : clamp(b.vy * B.tiltFactor, B.tiltUp, B.tiltDown);
  b.rot += (target - b.rot) * Math.min(1, dt * B.tiltSmoothing);
}

function updateWing(dt, loop) {
  const B = CONFIG.bird, b = state.bird;
  if (b.wingP < 1 || loop) {
    b.wingP += dt / B.wingFlapTime;
    if (b.wingP >= 1) b.wingP = loop ? b.wingP - 1 : 1;
  }
  b.wingAngle = -0.2 + (b.wingP < 1 ? Math.sin(b.wingP * TAU) * 0.95 : 0);
}

function scrollWorld(dt, speed) {
  world.groundOff = (world.groundOff + speed * dt) % 28;
  world.farOff = (world.farOff + speed * dt * 0.12) % 800;
  world.nearOff = (world.nearOff + speed * dt * 0.3) % 800;
  for (const c of world.clouds) {
    c.x -= speed * c.depth * dt;
    if (c.x < -100 * c.s) { c.x = W + rand(10, 80); c.y = rand(30, 220); }
  }
}

/* ---- difficulty helpers ---- */
function targetSpeed(score) {
  const D = CONFIG.difficulty, P = preset();
  if (!D.enabled) return P.baseSpeed;
  return Math.min(P.maxSpeed, P.baseSpeed + Math.floor(score / D.speedEveryPoints) * P.speedStep);
}
function currentGap(score) {
  const D = CONFIG.difficulty, P = preset();
  if (!D.enabled) return P.baseGap;
  const hardFloor = CONFIG.bird.hitboxRadius * 2 * D.minGapBirdHeights; // always fits the bird with margin
  return Math.max(P.minGap, hardFloor, P.baseGap - score * P.gapShrinkPerPoint);
}

/* ---- pipes ---- */
function spawnPipe(x) {
  const P = CONFIG.pipes;
  const gap = currentGap(state.score);
  const lo0 = P.edgeMargin + gap / 2;
  const hi0 = GROUND_Y - P.edgeMargin - gap / 2;
  const lo = Math.max(lo0, state.lastGapCenter - P.maxGapShift);
  const hi = Math.min(hi0, state.lastGapCenter + P.maxGapShift);
  const c = lo <= hi ? rand(lo, hi) : clamp(state.lastGapCenter, lo0, hi0);
  state.lastGapCenter = c;
  // Occasionally attach a power-up pickup to this pipe's gap.
  const PU = CONFIG.powerups;
  let power = null;
  state.sincePower++;
  if (PU.enabled && state.score >= PU.minScore && state.sincePower >= PU.minPipesBetween && Math.random() < PU.chance) {
    power = { type: pickPowerType(), taken: false };
    state.sincePower = 0;
  }
  state.pipes.push({ x, top: c - gap / 2, bot: c + gap / 2, passed: false, power });
}

function spawnPipes() {
  const P = CONFIG.pipes, a = state.pipes;
  if (!a.length) spawnPipe(W + P.firstPipeOffset);
  for (;;) {
    const nx = a[a.length - 1].x + P.spacing;
    if (nx > W + 30) break;
    spawnPipe(nx);
  }
}

function addScore(points) {
  const S = state, L = CONFIG.levels, old = S.score;
  S.score += points;
  S.scorePop = CONFIG.feedback.scorePopTime;
  if (L.enabled) {
    const lvl = Math.floor(S.score / L.pointsPerLevel) + 1;
    if (lvl > S.level) { S.level = lvl; S.banner = L.bannerSeconds; }
  }
  Sfx.score();
  checkAchievements();
}

function die() {
  const S = state, b = S.bird, F = CONFIG.feedback;
  if (S.mode !== 'playing') return;
  S.mode = 'gameover';
  S.deathTime = 0;
  S.shake = F.shakeTime;
  S.flash = F.flashTime;
  if (b.vy < 0) b.vy = 0;
  if (S.score > bests[difficulty]) { bests[difficulty] = S.score; S.newBest = true; saveBest(); }
  S.medal = medalFor(S.score);
  S.fx.shield = false; S.fx.invuln = 0;
  stats.games++;
  saveProgress();
  checkAchievements();
  emitBurst();
  Sfx.hit();
  Sfx.gameOver();
}

function medalFor(score) {
  if (!CONFIG.medals.enabled) return null;
  let m = null;
  for (const t of CONFIG.medals.tiers) if (score >= t.score) m = t;
  return m;
}

// Ease the shown colours toward the current level's theme (also handles changes mid-blend).
function updateTheme(dt) {
  const L = CONFIG.levels;
  const idx = themeIndexFor(state.score);
  const target = THEME_RGB[idx];
  const k = 1 - Math.exp(-dt * 3 / Math.max(0.05, L.transitionSeconds)); // ~95% there after transitionSeconds
  for (const key in target) {
    const c = theme.rgb[key], t = target[key];
    c[0] += (t[0] - c[0]) * k; c[1] += (t[1] - c[1]) * k; c[2] += (t[2] - c[2]) * k;
  }
  theme.stars += (THEMES[idx].stars - theme.stars) * k;
  theme.moon += ((THEMES[idx].body === 'moon' ? 1 : 0) - theme.moon) * k;
  theme.bodyY += (THEMES[idx].bodyY - theme.bodyY) * k;
}

/* ---- particles ---- */
function emitFlapParticles() {
  const S = state, b = S.bird, F = CONFIG.feedback;
  for (let i = 0; i < F.flapParticles; i++) {
    if (S.particles.length >= F.maxParticles) break;
    const feather = i % 3 !== 2;
    const life = rand(0.45, 0.8);
    S.particles.push({
      x: b.x - 12 + rand(-3, 3), y: b.y + 5 + rand(-3, 3),
      vx: -rand(30, 90) - S.speed * 0.35, vy: rand(10, 90),
      g: feather ? 140 : 60, life, max: life,
      size: feather ? rand(4, 6.5) : rand(1.5, 3),
      rot: rand(0, TAU), vr: rand(-8, 8),
      type: feather ? 'feather' : 'dust',
      color: feather ? (Math.random() < 0.5 ? '#ffffff' : '#ffe27a') : '#e8dcc0'
    });
  }
}

function emitBurst() {
  const S = state, b = S.bird, F = CONFIG.feedback;
  for (let i = 0; i < F.hitParticles; i++) {
    if (S.particles.length >= F.maxParticles) break;
    const a = rand(0, TAU), sp = rand(60, 220), life = rand(0.5, 1.0);
    S.particles.push({
      x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      g: 300, life, max: life, size: rand(4, 7), rot: rand(0, TAU), vr: rand(-10, 10),
      type: 'feather', color: Math.random() < 0.5 ? '#ffffff' : '#ffd23f'
    });
  }
}

function emitSparkle(x, y, color, n) {
  const S = state;
  for (let i = 0; i < n; i++) {
    if (S.particles.length >= CONFIG.feedback.maxParticles) break;
    const a = rand(0, TAU), sp = rand(40, 130), life = rand(0.35, 0.7);
    S.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, life, max: life,
      size: rand(1.8, 3.2), rot: 0, vr: 0, type: 'dust', color });
  }
}

function updateParticles(dt) {
  const a = state.particles;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    p.life -= dt;
    if (p.life <= 0) continue; // finished particles are dropped
    p.vy += p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
    a[n++] = p;
  }
  a.length = n;
}


/* ---- bird trail ---- */
function updateTrail(dt) {
  const S = state, V = CONFIG.visuals.trail;
  if (!V.enabled) { S.trail.length = 0; return; }
  const v = S.mode === 'playing' ? S.speed * S.speedMult : 0;
  if (S.mode === 'playing') {
    S.trailTimer += dt;
    if (S.trailTimer >= 0.025) { S.trailTimer = 0; S.trail.push({ x: S.bird.x, y: S.bird.y, life: V.length }); }
  }
  let n = 0;
  for (let i = 0; i < S.trail.length; i++) {
    const t = S.trail[i];
    t.life -= dt;
    if (t.life <= 0) continue;
    t.x -= v * dt;                // trail drifts back with the world
    S.trail[n++] = t;
  }
  S.trail.length = n;
}

/* ---- themed ambient particles (petals, embers, fireflies, dust, snow) ---- */
const AMBIENT = {
  petals:    (sc) => ({ x: W + 10, y: rand(-10, 380), vx: -rand(25, 55) - sc * 0.5, vy: rand(15, 35), size: rand(2.5, 4.5), color: Math.random() < 0.5 ? '#ffb7c5' : '#ffe0ea', life: 14, sway: rand(1, 2.5), spin: rand(-3, 3) }),
  snow:      (sc) => ({ x: rand(0, W + 60), y: -6, vx: -rand(4, 18) - sc * 0.3, vy: rand(28, 60), size: rand(1.4, 3), color: '#ffffff', life: 14, sway: rand(0.5, 1.5), spin: 0 }),
  dust:      (sc) => ({ x: W + 10, y: rand(180, 480), vx: -rand(45, 95) - sc * 0.8, vy: rand(-6, 6), size: rand(1, 2.2), color: '#f1d9a6', life: 10, sway: 0, spin: 0 }),
  embers:    (sc) => ({ x: rand(0, W), y: rand(300, GROUND_Y), vx: -rand(4, 14) - sc * 0.2, vy: -rand(20, 45), size: rand(1.4, 2.6), color: '#ffb066', life: rand(2.5, 4), sway: rand(1, 3), spin: 0 }),
  fireflies: (sc) => ({ x: rand(0, W), y: rand(120, 470), vx: -sc * 0.25, vy: 0, size: rand(1.8, 3), color: '#e8ff7a', life: rand(5, 8), sway: rand(1, 2), spin: 0 })
};

function updateAmbient(dt) {
  const A = CONFIG.visuals.ambient, a = world.ambient, S = state;
  if (!A.enabled) { a.length = 0; return; }
  const sc = S.mode === 'start' ? CONFIG.world.idleScrollSpeed : S.mode === 'playing' ? S.speed * S.speedMult : 0;
  const kind = THEMES[themeIndexFor(S.score)].ambient;
  const make = AMBIENT[kind];
  if (make && a.length < A.max) {
    world.ambientAcc += dt * A.perSecond;
    while (world.ambientAcc >= 1 && a.length < A.max) {
      world.ambientAcc -= 1;
      const p = make(sc);
      p.max = p.life; p.type = kind; p.ph = rand(0, TAU); p.t = 0; p.rot = rand(0, TAU);
      a.push(p);
    }
  }
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    p.life -= dt; p.t += dt;
    p.x += (p.vx + (p.sway ? Math.sin(p.t * p.sway + p.ph) * 14 : 0)) * dt;
    p.y += (p.vy + (p.type === 'fireflies' ? Math.cos(p.t * p.sway * 1.3 + p.ph) * 14 : 0)) * dt;
    p.rot += p.spin * dt;
    if (p.life <= 0 || p.x < -20 || p.x > W + 80 || p.y > H + 10 || p.y < -20) continue; // drop finished/off-screen
    a[n++] = p;
  }
  a.length = n;
}
