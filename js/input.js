'use strict';
/* =====================================================================
 * 3. INPUT  (keyboard, mouse, touch via pointer events)
 * ===================================================================== */
function handleAction() {
  const S = state;
  if (S.panel) { S.panel = null; return; } // close the achievements panel first
  if (S.mode === 'start') { S.mode = 'playing'; flap(); }
  else if (S.mode === 'playing') { if (S.countdown <= 0) flap(); } // no flapping during the resume countdown
  else if (S.mode === 'paused') { setPaused(false); }
  else if (S.mode === 'gameover') { if (S.deathTime >= CONFIG.feedback.restartDelay) resetGame(); }
}

function flap() {
  const b = state.bird;
  b.vy = CONFIG.bird.flapVelocity;
  b.wingP = 0;
  emitFlapParticles();
  Sfx.flap();
}

function togglePause() {
  if (!CONFIG.pause.enabled) return;
  if (state.mode === 'playing') setPaused(true);
  else if (state.mode === 'paused') setPaused(false);
  // start and game over: do nothing
}
function setPaused(p) {
  state.mode = p ? 'paused' : 'playing';
  state.countdown = p ? 0 : Math.max(0, CONFIG.pause.resumeCountdown); // 3-2-1 before play continues
  lastTs = null; // next frame starts with dt = 0
}

// Difficulty can only change on the start screen.
function setDifficulty(key) {
  if (state.mode !== 'start' || !CONFIG.difficulty.presets[key]) return;
  difficulty = key;
  state.speed = preset().baseSpeed;
  saveDifficulty();
}
function stepDifficulty(dir) {
  const i = DIFF_KEYS.indexOf(difficulty);
  setDifficulty(DIFF_KEYS[(i + dir + DIFF_KEYS.length) % DIFF_KEYS.length]);
}
// On-screen difficulty buttons (start screen).
function diffButtonRect(i) {
  const n = DIFF_KEYS.length, w = 84, h = 30, g = 10;
  return { x: (W - (n * w + (n - 1) * g)) / 2 + i * (w + g), y: 338, w, h };
}
function diffButtonAt(x, y) {
  for (let i = 0; i < DIFF_KEYS.length; i++) {
    const r = diffButtonRect(i);
    if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) return DIFF_KEYS[i];
  }
  return null;
}

function onKeyDown(e) {
  Sfx.init(); // audio starts only after the first user input
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (e.repeat || input.spaceHeld) return; // holding Space = one flap only
      input.spaceHeld = true;
      handleAction();
      break;
    case 'KeyM': if (!e.repeat) Sfx.toggleMute(); break;
    case 'KeyP':
    case 'Escape': if (!e.repeat) { if (state.panel) state.panel = null; else togglePause(); } break;
    case 'ArrowLeft': if (!e.repeat) stepDifficulty(-1); break;
    case 'ArrowRight': if (!e.repeat) stepDifficulty(1); break;
    case 'ArrowUp': if (!e.repeat) stepSkin(-1); break;
    case 'ArrowDown': if (!e.repeat) stepSkin(1); break;
    case 'KeyA': if (!e.repeat) togglePanel(); break;
    default:
      if (!e.repeat && /^(Digit|Numpad)[1-9]$/.test(e.code)) setDifficulty(DIFF_KEYS[Number(e.code.slice(-1)) - 1]);
  }
}
function onKeyUp(e) { if (e.code === 'Space') input.spaceHeld = false; }

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  Sfx.init();
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W;
  const y = (e.clientY - r.top) / r.height * H;
  if (CONFIG.sound.enabled && Math.hypot(x - MUTE_BTN.x, y - MUTE_BTN.y) <= MUTE_BTN.r + 6) {
    Sfx.toggleMute();
    return;
  }
  if (state.panel) { state.panel = null; return; }
  if (state.mode === 'start') {
    if (CONFIG.achievements.enabled && hitCircle(x, y, TROPHY_BTN, 6)) { togglePanel(); return; }
    if (skinChoices() > 1) {
      if (hitCircle(x, y, SKIN_ARROWS.left, 8)) { stepSkin(-1); return; }
      if (hitCircle(x, y, SKIN_ARROWS.right, 8)) { stepSkin(1); return; }
    }
    const k = diffButtonAt(x, y);
    if (k) { setDifficulty(k); return; }
  }
  if (CONFIG.pause.enabled && (state.mode === 'playing' || state.mode === 'paused') &&
      Math.hypot(x - PAUSE_BTN.x, y - PAUSE_BTN.y) <= PAUSE_BTN.r + 6) {
    togglePause();
    return;
  }
  handleAction();
}

// Losing focus or hiding the tab auto-pauses; regaining it never skips ahead.
function autoPause() {
  input.spaceHeld = false;
  if (CONFIG.pause.enabled && CONFIG.pause.autoPauseOnBlur && state.mode === 'playing') setPaused(true);
  lastTs = null;
}

