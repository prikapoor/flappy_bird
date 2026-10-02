'use strict';
/* =====================================================================
 * 6. COLLISION  (circle hitbox vs pipe rectangles, ground, ceiling)
 * ===================================================================== */
function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const dx = cx - clamp(cx, rx, rx + rw);
  const dy = cy - clamp(cy, ry, ry + rh);
  return dx * dx + dy * dy < r * r;
}

// Returns 'ceiling' | 'ground' | 'pipe' on a collision, or false.
function checkCollisions() {
  const b = state.bird, r = CONFIG.bird.hitboxRadius, P = CONFIG.pipes;
  if (b.y - r <= 0) { b.y = r; return 'ceiling'; }
  if (b.y + r >= GROUND_Y) { b.y = GROUND_Y - r; return 'ground'; }
  const w = P.width, o = P.capOverhang, ch = P.capHeight;
  for (let i = 0; i < state.pipes.length; i++) {
    const p = state.pipes[i];
    if (p.x - o > b.x + r || p.x + w + o < b.x - r) continue;         // not near the bird
    if (circleRect(b.x, b.y, r, p.x, -1000, w, p.top - ch + 1000)) return 'pipe';   // top body
    if (circleRect(b.x, b.y, r, p.x - o, p.top - ch, w + 2 * o, ch)) return 'pipe'; // top cap
    if (circleRect(b.x, b.y, r, p.x - o, p.bot, w + 2 * o, ch)) return 'pipe';      // bottom cap
    if (circleRect(b.x, b.y, r, p.x, p.bot + ch, w, 1000)) return 'pipe';           // bottom body
  }
  return false;
}
