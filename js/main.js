'use strict';
/* =====================================================================
 * 8. RESIZE + MAIN LOOP
 * ===================================================================== */
// Fit the 400x600 world into the window, keeping aspect ratio and sharp on high-DPI screens.
function resize() {
  const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(1, Math.floor(W * fit));
  const cssH = Math.max(1, Math.floor(H * fit));
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
}

function frame(ts) {
  requestAnimationFrame(frame);
  // Delta time in seconds, capped so a tab switch or hiccup can't cause a jump.
  const dt = lastTs === null ? 0 : clamp((ts - lastTs) / 1000, 0, CONFIG.timing.maxDelta);
  lastTs = ts;
  update(dt);
  render();
}

/* ---- event wiring ---- */
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); else lastTs = null; });
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

bests = loadBests();
difficulty = loadDifficulty();
Sfx.muted = loadMuted();
loadProgress();
loadSkin();
resetGame();
resize();
requestAnimationFrame(frame);
