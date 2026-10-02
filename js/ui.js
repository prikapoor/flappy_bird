'use strict';
/* =====================================================================
 * 8. UI  (HUD, menus, overlays)
 * ===================================================================== */
/* ---- UI ---- */
function drawText(str, x, y, size, o) {
  o = o || {};
  ctx.save();
  ctx.font = 'bold ' + size + 'px ' + CONFIG.ui.font;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.scale && o.scale !== 1) { ctx.translate(x, y); ctx.scale(o.scale, o.scale); x = 0; y = 0; }
  if (o.stroke !== null) {
    ctx.lineWidth = o.strokeWidth || size * 0.18;
    ctx.strokeStyle = o.stroke || '#3b2a1e';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = o.fill || '#fff';
  ctx.fillText(str, x, y);
  ctx.restore();
}

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawUI() {
  const S = state, F = CONFIG.feedback;
  const blink = 0.55 + 0.45 * Math.sin(S.time * 4);

  if (S.mode === 'start') {
    drawTitle(S.time);
    drawText('Tap, click or press SPACE', W / 2, 400, 20, { alpha: blink });
    const hints = [];
    if (CONFIG.sound.enabled) hints.push('M = mute');
    if (CONFIG.pause.enabled) hints.push('P / Esc = pause');
    if (hints.length) drawText(hints.join('   -   '), W / 2, 432, 14, { stroke: '#2a5d77', alpha: 0.9 });
    drawText('Left / Right or 1-2-3 = difficulty', W / 2, 452, 14, { stroke: '#2a5d77', alpha: 0.9 });
    const extra = [];
    if (skinChoices() > 1) extra.push('Up / Down = bird');
    if (CONFIG.achievements.enabled) extra.push('A = achievements');
    if (extra.length) drawText(extra.join('   -   '), W / 2, 472, 14, { stroke: '#2a5d77', alpha: 0.9 });
    for (let i = 0; i < DIFF_KEYS.length; i++) {
      const r = diffButtonRect(i), sel = DIFF_KEYS[i] === difficulty;
      rrect(r.x, r.y, r.w, r.h, 15);
      ctx.fillStyle = sel ? '#ffb347' : 'rgba(0,0,0,0.35)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = sel ? '#5a2d0c' : 'rgba(255,255,255,0.6)'; ctx.stroke();
      drawText(CONFIG.difficulty.presets[DIFF_KEYS[i]].label, r.x + r.w / 2, r.y + r.h / 2 + 1, 14,
        { fill: sel ? '#3b2a1e' : '#fff', stroke: null });
    }
    if (skinChoices() > 1) {
      drawArrowButton(SKIN_ARROWS.left, -1);
      drawArrowButton(SKIN_ARROWS.right, 1);
    }
    if (CONFIG.skins.enabled) drawText(currentSkin().name, CONFIG.bird.x, 292, 14, { stroke: '#2a5d77' });
    if (bests[difficulty] > 0) drawText('Best: ' + bests[difficulty], W / 2, 314, 15, { stroke: '#2a5d77', alpha: 0.95 });
  }

  if (S.mode === 'playing' || S.mode === 'paused' || (S.mode === 'gameover' && S.deathTime < F.gameOverPanelDelay)) {
    let scale = 1;
    if (S.scorePop > 0) scale = 1 + F.scorePopScale * Math.sin((1 - S.scorePop / F.scorePopTime) * Math.PI);
    drawText(String(S.score), W / 2, 80, 56, { scale, strokeWidth: 8 });
    if (CONFIG.levels.enabled) drawText('LEVEL ' + S.level, W / 2, 122, 14, { alpha: 0.9 });
    drawEffectsHud();
  }

  if (S.mode === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
    drawText('PAUSED', W / 2, 270, 52);
    drawText('Press P / Esc or tap to resume', W / 2, 320, 18, { stroke: null });
  }

  if (S.mode === 'playing' && S.countdown > 0) {
    const f = S.countdown - Math.floor(S.countdown);           // 1 -> 0 within each second
    const n = Math.ceil(S.countdown);
    drawText(String(n), W / 2, 270, 90, { scale: 1 + 0.35 * (f === 0 ? 0 : f), alpha: 0.6 + 0.4 * (1 - f), strokeWidth: 10 });
  }

  if (S.mode === 'playing' && S.banner > 0 && CONFIG.levels.enabled) {
    const L = CONFIG.levels;
    const a = clamp(S.banner / 0.4, 0, 1) * clamp((L.bannerSeconds - S.banner) / 0.15, 0, 1);
    drawText('LEVEL ' + S.level, W / 2, 165, 36, { alpha: a, strokeWidth: 7 });
    drawText(THEMES[themeIndexFor(S.score)].name, W / 2, 200, 18, { alpha: a, stroke: '#3b2a1e' });
  }

  if (S.mode === 'gameover') drawGameOver();
  if (S.mode === 'start') {
    drawTrophyButton();
    if (S.panel === 'ach') drawAchievementsPanel();
  }
  drawToast();
  drawPauseButton();
  drawMuteButton();
}

function drawPauseButton() {
  const S = state;
  if (!CONFIG.pause.enabled || (S.mode !== 'playing' && S.mode !== 'paused')) return;
  const x = PAUSE_BTN.x, y = PAUSE_BTN.y;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.arc(x, y, PAUSE_BTN.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  if (S.mode === 'paused') {          // show a play triangle while paused
    ctx.beginPath(); ctx.moveTo(x - 4, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x - 4, y + 8); ctx.closePath(); ctx.fill();
  } else {                            // two bars while playing
    ctx.fillRect(x - 7, y - 8, 5, 16);
    ctx.fillRect(x + 2, y - 8, 5, 16);
  }
  ctx.restore();
}

function drawGameOver() {
  const S = state, F = CONFIG.feedback;
  const t = clamp((S.deathTime - F.gameOverPanelDelay) / 0.45, 0, 1);
  if (t <= 0) return;
  const e = 1 - Math.pow(1 - t, 3);
  const showMedal = CONFIG.medals.enabled;
  const sx = showMedal ? 258 : W / 2;

  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(0, (1 - e) * 40);

  drawText('GAME OVER', W / 2, 140, 44, { fill: '#ffb347', stroke: '#5a2d0c' });
  drawText(preset().label + ' MODE', W / 2, 169, 14, { stroke: '#5a2d0c' });

  rrect(50, 185, 300, 205, 14);
  ctx.fillStyle = '#ded895'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#543847'; ctx.stroke();

  if (showMedal) {
    drawMedal(115, 280, 40, S.medal);
    drawText(S.medal ? S.medal.name : 'No medal', 115, 345, 15, { fill: '#7a5a3a', stroke: null });
  }
  drawText('SCORE', sx, 222, 15, { fill: '#d9672a', stroke: null });
  drawText(String(S.score), sx, 252, 34, { stroke: '#3b2a1e' });
  drawText('BEST', sx, 300, 15, { fill: '#d9672a', stroke: null });
  drawText(String(bests[difficulty]), sx, 330, 34, { stroke: '#3b2a1e' });
  if (S.newBest) {
    rrect(sx + 26, 318, 38, 20, 6);
    ctx.fillStyle = '#e8402a'; ctx.fill();
    drawText('NEW', sx + 45, 328.5, 12, { stroke: null });
  }

  if (S.deathTime >= F.restartDelay) {
    const blink = 0.55 + 0.45 * Math.sin(S.time * 4);
    drawText('Tap, click or press SPACE', W / 2, 440, 20, { alpha: blink });
    drawText('to play again', W / 2, 466, 16, { alpha: blink, stroke: '#3b2a1e' });
  }
  ctx.restore();
}

function drawMedal(cx, cy, r, medal) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!medal) {
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(84,56,71,0.35)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.restore();
    return;
  }
  // ribbon tails
  ctx.fillStyle = '#d94a3a';
  ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.2); ctx.lineTo(-r * 0.15, -r * 1.05); ctx.lineTo(r * 0.05, -r * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a6fd9';
  ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.2); ctx.lineTo(r * 0.15, -r * 1.05); ctx.lineTo(-r * 0.05, -r * 0.5); ctx.closePath(); ctx.fill();
  // disc
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, medal.light);
  g.addColorStop(0.6, medal.base);
  g.addColorStop(1, medal.dark);
  ctx.fillStyle = g;
  ctx.lineWidth = 3; ctx.strokeStyle = medal.dark;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = medal.light;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.76, 0, TAU); ctx.stroke();
  // star
  ctx.fillStyle = medal.light;
  ctx.strokeStyle = medal.dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r * 0.5 : r * 0.22;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawMuteButton() {
  if (!CONFIG.sound.enabled) return;
  const x = MUTE_BTN.x, y = MUTE_BTN.y;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.arc(x, y, MUTE_BTN.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 3); ctx.lineTo(x - 4, y - 3); ctx.lineTo(x + 1, y - 8);
  ctx.lineTo(x + 1, y + 8); ctx.lineTo(x - 4, y + 3); ctx.lineTo(x - 9, y + 3);
  ctx.closePath(); ctx.fill();
  if (Sfx.muted) {
    ctx.strokeStyle = '#ff6b5e';
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 4); ctx.lineTo(x + 12, y + 4);
    ctx.moveTo(x + 12, y - 4); ctx.lineTo(x + 5, y + 4);
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(x + 1, y, 5, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 1, y, 9, -0.9, 0.9); ctx.stroke();
  }
  ctx.restore();
}

/* ---- fancy title, skin arrows, power-up HUD, achievements ---- */
function drawTitle(t) {
  const str = CONFIG.title, size = 46;
  if (!CONFIG.visuals.waveTitle) {
    drawText(str, W / 2, 140 + Math.sin(t * 2) * 4, size, { fill: '#fff', stroke: '#2a5d77' });
    return;
  }
  const chars = Array.from(str);
  ctx.save();
  ctx.font = 'bold ' + size + 'px ' + CONFIG.ui.font;
  const widths = chars.map((c) => ctx.measureText(c).width);
  ctx.restore();
  let x = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
  chars.forEach((c, i) => {
    drawText(c, x + widths[i] / 2, 140 + Math.sin(t * 3 + i * 0.55) * 6, size,
      { fill: 'hsl(' + Math.round((i * 24 + t * 40) % 360) + ',85%,82%)', stroke: '#2a5d77' });
    x += widths[i];
  });
}

function drawArrowButton(c, dir) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(c.x - dir * 5, c.y - 7); ctx.lineTo(c.x + dir * 5, c.y); ctx.lineTo(c.x - dir * 5, c.y + 7);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTrophyButton() {
  if (!CONFIG.achievements.enabled) return;
  const x = TROPHY_BTN.x, y = TROPHY_BTN.y;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.arc(x, y, TROPHY_BTN.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 8); ctx.lineTo(x + 7, y - 8); ctx.lineTo(x + 5, y + 1); ctx.lineTo(x - 5, y + 1);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 1.5, y + 1, 3, 5);
  ctx.fillRect(x - 5, y + 6, 10, 2.5);
  ctx.restore();
}

// On-screen list of active power-ups (shield, slow-mo and double-points timers).
function drawEffectsHud() {
  const fx = state.fx, PU = CONFIG.powerups;
  if (!PU.enabled) return;
  let y = 28;
  const row = (type, frac) => {
    drawPowerIcon(type, 24, y, 11, false);
    if (frac === null) drawText('ON', 42, y + 1, 12, { align: 'left', stroke: '#3b2a1e' });
    else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; rrect(40, y - 3, 46, 6, 3); ctx.fill();
      if (frac > 0.05) { ctx.fillStyle = PU.colors[type]; rrect(40, y - 3, 46 * frac, 6, 3); ctx.fill(); }
    }
    y += 30;
  };
  if (fx.shield) row('shield', null);
  if (fx.slow > 0) row('slow', fx.slow / PU.slowSeconds);
  if (fx.double > 0) row('double', fx.double / PU.doubleSeconds);
}

function drawToast() {
  if (!toasts.length) return;
  const t = toasts[0];
  const a = clamp(Math.min(t.life / 0.3, (t.max - t.life) / 0.25), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - a) * -20);
  rrect(82, 10, 220, 42, 10);
  ctx.fillStyle = 'rgba(20,20,35,0.88)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
  drawText(t.title, 192, 24, 11, { fill: '#ffd23f', stroke: null });
  drawText(t.name, 192, 41, 15, { stroke: null });
  ctx.restore();
}

function drawAchievementsPanel() {
  const A = CONFIG.achievements;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  rrect(30, 56, 340, 494, 16);
  ctx.fillStyle = '#ded895'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#543847'; ctx.stroke();
  drawText('ACHIEVEMENTS', W / 2, 88, 26, { fill: '#ffb347', stroke: '#5a2d0c' });
  drawText(achieved.size + ' / ' + A.list.length + ' unlocked', W / 2, 114, 13, { fill: '#7a5a3a', stroke: null });
  A.list.forEach((a, i) => {
    const y = 142 + i * 46, got = achieved.has(a.id);
    ctx.fillStyle = got ? '#4caf50' : 'rgba(84,56,71,0.25)';
    ctx.beginPath(); ctx.arc(62, y + 16, 12, 0, TAU); ctx.fill();
    if (got) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(56, y + 16); ctx.lineTo(61, y + 21); ctx.lineTo(69, y + 11); ctx.stroke();
    }
    const reward = CONFIG.skins.enabled ? CONFIG.skins.list.find((s) => s.unlock === a.id) : null;
    drawText(a.name, 84, y + 8, 16, { align: 'left', fill: got ? '#3b2a1e' : '#7a5a3a', stroke: null });
    drawText(a.desc + (reward ? ' - unlocks ' + reward.name + ' skin' : ''), 84, y + 27, 12,
      { align: 'left', fill: '#7a5a3a', stroke: null });
  });
  drawText('Tap or press A / Esc to close', W / 2, 528, 13, { fill: '#7a5a3a', stroke: null });
}
