'use strict';
/* =====================================================================
 * 7. RENDER
 * ===================================================================== */
function computeTheme() {
  for (const k in theme.rgb) {
    const c = theme.rgb[k];
    theme.cur[k] = 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  }
}

function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  computeTheme();

  ctx.save();
  const S = state, F = CONFIG.feedback;
  if (S.shake > 0) {
    const m = F.shakeMagnitude * S.shake / F.shakeTime;
    ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
  }
  drawSky();
  drawStars();
  drawCelestial();
  drawClouds();
  drawHills();
  drawAmbient();
  drawPipes();
  drawPickups();
  drawGround();
  drawTrail();
  drawParticles();
  drawBird();
  ctx.restore();

  drawUI();
  if (S.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * S.flash / F.flashTime).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

/* ---- world ---- */
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, theme.cur.skyTop);
  g.addColorStop(1, theme.cur.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);
}

function drawStars() {
  if (theme.stars < 0.01) return;
  ctx.fillStyle = '#ffffff';
  for (const s of world.stars) {
    ctx.globalAlpha = theme.stars * (0.55 + 0.45 * Math.sin(state.time * 2 + s.ph));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawClouds() {
  ctx.fillStyle = theme.cur.cloud;
  ctx.globalAlpha = 0.9;
  for (const c of world.clouds) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.s, c.s);
    ctx.beginPath();
    ctx.arc(0, 10, 16, 0, TAU);
    ctx.arc(22, 0, 22, 0, TAU);
    ctx.arc(48, 6, 18, 0, TAU);
    ctx.arc(66, 12, 13, 0, TAU);
    ctx.rect(0, 10, 66, 16);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Seamless hill profile (period 800px) so the scroll offset can wrap cleanly.
function hillHeight(u, minH, amp) {
  const k = TAU / 800;
  const v = Math.sin(k * u) * 0.6 + Math.sin(2 * k * u + 1.3) * 0.3 + Math.sin(3 * k * u + 2.1) * 0.1;
  return minH + amp * (0.5 + 0.5 * v);
}
function drawHillLayer(off, minH, amp, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, GROUND_Y + 2);
  for (let x = -20; x <= W + 20; x += 6) ctx.lineTo(x, GROUND_Y - hillHeight(x + off, minH, amp));
  ctx.lineTo(W + 20, GROUND_Y + 2);
  ctx.closePath();
  ctx.fill();
}
function drawHills() {
  drawHillLayer(world.farOff, 45, 75, theme.cur.hillFar);
  drawHillLayer(world.nearOff + 300, 15, 45, theme.cur.hillNear);
}

function drawPipes() {
  const P = CONFIG.pipes, c = theme.cur, w = P.width, o = P.capOverhang, ch = P.capHeight;
  if (!state.pipes.length) return;

  // Horizontal gradients give each pipe a highlight on the left and a shadow on the right.
  const bodyG = ctx.createLinearGradient(0, 0, w, 0);
  bodyG.addColorStop(0, c.pipeDark);
  bodyG.addColorStop(0.1, c.pipe);
  bodyG.addColorStop(0.25, c.pipeLight);
  bodyG.addColorStop(0.5, c.pipe);
  bodyG.addColorStop(1, c.pipeDark);
  const capG = ctx.createLinearGradient(-o, 0, w + o, 0);
  capG.addColorStop(0, c.pipeDark);
  capG.addColorStop(0.1, c.pipe);
  capG.addColorStop(0.25, c.pipeLight);
  capG.addColorStop(0.5, c.pipe);
  capG.addColorStop(1, c.pipeDark);

  ctx.lineWidth = 2;
  ctx.strokeStyle = c.pipeOutline;
  for (const p of state.pipes) {
    ctx.save();
    ctx.translate(p.x, 0);
    // bodies
    ctx.fillStyle = bodyG;
    ctx.fillRect(0, -4, w, p.top - ch + 4);
    ctx.strokeRect(0, -4, w, p.top - ch + 4);
    ctx.fillRect(0, p.bot + ch, w, GROUND_Y - p.bot - ch + 4);
    ctx.strokeRect(0, p.bot + ch, w, GROUND_Y - p.bot - ch + 4);
    // soft shadow where each cap meets its body
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, p.top - ch - 8, w, 8);
    ctx.fillRect(0, p.bot + ch, w, 8);
    // caps
    ctx.fillStyle = capG;
    ctx.fillRect(-o, p.top - ch, w + 2 * o, ch);
    ctx.strokeRect(-o, p.top - ch, w + 2 * o, ch);
    ctx.fillRect(-o, p.bot, w + 2 * o, ch);
    ctx.strokeRect(-o, p.bot, w + 2 * o, ch);
    ctx.restore();
  }
}

function drawGround() {
  const c = theme.cur, grassH = 16, period = 28;
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  g.addColorStop(0, c.dirt);
  g.addColorStop(1, c.dirtDark);
  ctx.fillStyle = g;
  ctx.fillRect(-20, GROUND_Y, W + 40, H - GROUND_Y + 20);
  ctx.fillStyle = c.grass;
  ctx.fillRect(-20, GROUND_Y, W + 40, grassH);
  ctx.fillStyle = c.grassStripe;
  for (let x = -period * 2 - world.groundOff; x < W + period; x += period) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y); ctx.lineTo(x + 14, GROUND_Y);
    ctx.lineTo(x + 4, GROUND_Y + grassH); ctx.lineTo(x - 10, GROUND_Y + grassH);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = c.groundEdge;
  ctx.fillRect(-20, GROUND_Y, W + 40, 3);
  ctx.fillRect(-20, GROUND_Y + grassH, W + 40, 2);
}

function drawParticles() {
  for (const p of state.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.type === 'feather') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.38, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.4 - a * 0.4), 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawBird() {
  const S = state, b = S.bird, s = CONFIG.bird.size / 17, k = currentSkin();
  ctx.save();
  if (S.fx.invuln > 0) ctx.globalAlpha = Math.floor(S.time * 18) % 2 ? 0.35 : 0.85; // flicker after a shield breaks
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  ctx.scale(s, s);
  ctx.lineWidth = 2;
  ctx.strokeStyle = k.outline;
  ctx.lineJoin = 'round';

  // body
  const g = ctx.createLinearGradient(0, -13, 0, 13);
  g.addColorStop(0, k.body[0]);
  g.addColorStop(1, k.body[1]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 13, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // belly
  ctx.fillStyle = k.belly;
  ctx.beginPath(); ctx.ellipse(4, 5, 9, 5.5, 0, 0, TAU); ctx.fill();
  // wing (rotates around the shoulder)
  ctx.save();
  ctx.translate(-4, 2);
  ctx.rotate(b.wingAngle);
  ctx.fillStyle = k.wing;
  ctx.beginPath(); ctx.ellipse(-6, 0, 10, 5.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
  // eye
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(7, -5, 5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(9, -5, 2.2, 0, TAU); ctx.fill();
  // beak
  ctx.fillStyle = k.beak[0];
  ctx.beginPath(); ctx.moveTo(12, -1.5); ctx.lineTo(23, 1.5); ctx.lineTo(12, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = k.beak[1];
  ctx.beginPath(); ctx.moveTo(12, 3.5); ctx.lineTo(21, 4.5); ctx.lineTo(12, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  // shield bubble
  if (S.fx.shield && (S.mode === 'playing' || S.mode === 'paused')) {
    const pulse = 1 + Math.sin(S.time * 6) * 0.05, R = 26 * pulse;
    ctx.save();
    ctx.translate(b.x, b.y);
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, R);
    sg.addColorStop(0, 'rgba(74,168,255,0.05)');
    sg.addColorStop(1, 'rgba(74,168,255,0.45)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(180,225,255,0.9)'; ctx.stroke();
    ctx.restore();
  }
}

/* ---- sun / moon, ambient particles, trail, pickups ---- */
function drawCelestial() {
  if (!CONFIG.visuals.celestial.enabled) return;
  const x = W - 95, y = theme.bodyY, r = 30;
  const c = theme.rgb.sun, rgb = Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]);
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.8);
  g.addColorStop(0, 'rgba(' + rgb + ',0.45)');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, TAU); ctx.fill();
  ctx.fillStyle = theme.cur.sun;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (theme.moon > 0.01) { // craters fade in as the sun becomes the moon
    ctx.fillStyle = 'rgba(90,100,130,' + (0.22 * theme.moon).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x - 9, y - 7, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y + 3, 8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 4, y + 13, 4, 0, TAU); ctx.fill();
  }
}

function drawAmbient() {
  const a = world.ambient;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const fade = clamp(Math.min(p.life / 0.8, (p.max - p.life) / 0.6), 0, 1);
    ctx.fillStyle = p.color;
    switch (p.type) {
      case 'petals':
        ctx.globalAlpha = 0.9 * fade;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU); ctx.fill();
        ctx.restore();
        break;
      case 'snow':
        ctx.globalAlpha = 0.95 * fade;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(110,150,190,0.55)'; ctx.lineWidth = 0.8; ctx.stroke(); // faint edge so snow reads on pale sky
        break;
      case 'dust':
        ctx.globalAlpha = 0.45 * fade;
        ctx.fillRect(p.x, p.y, p.size * 5, p.size * 0.7);
        break;
      case 'embers':
        ctx.globalAlpha = 0.9 * fade * (0.6 + 0.4 * Math.sin(p.t * 8 + p.ph));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        break;
      case 'fireflies': {
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.t * 3 + p.ph));
        ctx.globalAlpha = 0.25 * fade * pulse;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, TAU); ctx.fill();
        ctx.globalAlpha = fade * pulse;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawTrail() {
  const t = state.trail;
  if (t.length < 2) return;
  const maxLife = CONFIG.visuals.trail.length;
  ctx.save();
  ctx.fillStyle = currentSkin().body[1];
  for (let i = 0; i < t.length; i++) {
    const a = t[i].life / maxLife;
    ctx.globalAlpha = 0.35 * a;
    ctx.beginPath(); ctx.arc(t[i].x, t[i].y, 2 + 8 * a, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawPickups() {
  if (!CONFIG.powerups.enabled) return;
  for (const p of state.pipes) {
    if (!p.power || p.power.taken) continue;
    const c = powerPos(p);
    drawPowerIcon(p.power.type, c.x, c.y, 13, true);
  }
}

// Round badge with a glyph; used for pickups and the on-screen effect list.
function drawPowerIcon(type, x, y, r, glow) {
  const col = CONFIG.powerups.colors[type], u = r / 13;
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.2);
    g.addColorStop(0, col + 'aa');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  if (type === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -7 * u); ctx.lineTo(6 * u, -4.5 * u); ctx.lineTo(5 * u, 2 * u);
    ctx.quadraticCurveTo(3 * u, 6 * u, 0, 8 * u); ctx.quadraticCurveTo(-3 * u, 6 * u, -5 * u, 2 * u);
    ctx.lineTo(-6 * u, -4.5 * u); ctx.closePath(); ctx.fill();
  } else if (type === 'slow') {
    ctx.beginPath(); ctx.arc(0, 0, 6.5 * u, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -4 * u); ctx.lineTo(0, 0); ctx.lineTo(3.5 * u, 2 * u); ctx.stroke();
  } else {
    ctx.font = 'bold ' + (11 * u) + 'px ' + CONFIG.ui.font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x2', 0, 1);
  }
  ctx.restore();
}
