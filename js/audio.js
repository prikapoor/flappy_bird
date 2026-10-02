'use strict';
/* =====================================================================
 * 4. AUDIO  (Web Audio API, no files)
 * ===================================================================== */
const Sfx = {
  ctx: null, master: null, noise: null, muted: false, failed: false,

  init() {
    if (!CONFIG.sound.enabled || this.failed) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.failed = true; return; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : CONFIG.sound.volume;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.4);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') {
        const p = this.ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { this.failed = true; this.ctx = null; }
  },

  ready() { return CONFIG.sound.enabled && !!this.ctx && !this.muted; },

  toggleMute() {
    if (!CONFIG.sound.enabled) return;
    this.muted = !this.muted;
    saveMuted(this.muted);
    if (this.master) this.master.gain.value = this.muted ? 0 : CONFIG.sound.volume;
  },

  // One oscillator note with a quick attack/decay envelope and optional pitch slide.
  tone(freq, endFreq, dur, type, vol, delay) {
    if (!this.ready()) return;
    try {
      const t = this.ctx.currentTime + (delay || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (endFreq && endFreq !== freq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* ignore audio errors */ }
  },

  burst(dur, vol, cutoff) {
    if (!this.ready() || !this.noise) return;
    try {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      src.buffer = this.noise;
      f.type = 'lowpass'; f.frequency.value = cutoff;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + 0.03);
    } catch (e) { /* ignore audio errors */ }
  },

  power()    { this.tone(660, 660, 0.07, 'triangle', 0.3); this.tone(880, 880, 0.07, 'triangle', 0.3, 0.07); this.tone(1320, 1320, 0.12, 'triangle', 0.3, 0.14); },
  shieldBreak() { this.burst(0.15, 0.4, 3000); this.tone(500, 160, 0.25, 'sine', 0.35); },
  achievement() {
    this.tone(523, 523, 0.1, 'square', 0.14); this.tone(659, 659, 0.1, 'square', 0.14, 0.1);
    this.tone(784, 784, 0.1, 'square', 0.14, 0.2); this.tone(1047, 1047, 0.25, 'square', 0.14, 0.3);
  },
  flap()     { this.tone(320, 650, 0.11, 'triangle', 0.35); },
  score()    { this.tone(880, 880, 0.08, 'square', 0.14); this.tone(1320, 1320, 0.14, 'square', 0.14, 0.08); },
  hit()      { this.burst(0.2, 0.6, 1800); this.tone(220, 60, 0.22, 'sawtooth', 0.3); },
  gameOver() {
    this.tone(392, 392, 0.16, 'triangle', 0.3, 0.30);
    this.tone(330, 330, 0.16, 'triangle', 0.3, 0.46);
    this.tone(262, 190, 0.40, 'triangle', 0.3, 0.62);
  }
};
