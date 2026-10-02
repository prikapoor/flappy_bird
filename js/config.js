'use strict';
/* =====================================================================
 * 1. CONFIG  -  every tunable value lives here
 * ===================================================================== */
const CONFIG = {
  title: 'SKY FLAPPER',

  // Logical world size. The canvas is scaled to fit the window; physics never changes.
  world: { width: 400, height: 600, groundHeight: 90, idleScrollSpeed: 60 },

  // Largest time step (seconds) per frame. Prevents jumps after tab switches or lag.
  timing: { maxDelta: 0.05 },

  bird: {
    x: 110,               // fixed horizontal position
    startY: 260,          // start/idle height
    size: 17,             // half-length of the drawn body (pixels)
    hitboxRadius: 11,     // collision circle (smaller than the sprite = fairer)
    gravity: 1400,        // px/s^2
    flapVelocity: -400,   // px/s (negative = up)
    maxFallSpeed: 650,    // terminal velocity px/s
    wingFlapTime: 0.30,   // seconds for one wing flap
    bobAmplitude: 8,      // idle bob on start screen (px)
    bobSpeed: 4.5,        // idle bob speed (rad/s)
    tiltUp: -0.5,         // radians when rising
    tiltDown: 1.4,        // radians when diving
    tiltFactor: 0.0032,   // radians per px/s of vertical speed
    tiltSmoothing: 14     // higher = snappier rotation
  },

  pipes: {
    width: 66,
    capHeight: 24,
    capOverhang: 4,       // cap sticks out this far on each side
    spacing: 220,         // horizontal distance between pipe pairs
    firstPipeOffset: 30,  // first pipe spawns this far past the right edge
    edgeMargin: 55,       // gap edges stay at least this far from ceiling/ground
    maxGapShift: 170      // max vertical change of gap centre between pipes (keeps it passable)
  },

  // Difficulty. The player picks a preset on the start screen (Left/Right, keys 1-3, or tap a button).
  // Inside a run, speed rises and the gap narrows with score, up to each preset's caps.
  // enabled:false = no ramp (constant baseSpeed and baseGap).
  difficulty: {
    enabled: true,
    initial: 'normal',          // preset used the very first time (later choices are remembered)
    speedEveryPoints: 10,       // speed steps up every N points
    speedAcceleration: 40,      // px/s^2, how quickly speed eases to its new target
    minGapBirdHeights: 4,       // hard safety floor = this many bird hitbox diameters
    presets: {
      easy:   { label: 'EASY',   baseSpeed: 110, maxSpeed: 180, speedStep: 8,  baseGap: 185, minGap: 135, gapShrinkPerPoint: 1.0 },
      normal: { label: 'NORMAL', baseSpeed: 130, maxSpeed: 220, speedStep: 10, baseGap: 160, minGap: 112, gapShrinkPerPoint: 1.2 },
      hard:   { label: 'HARD',   baseSpeed: 160, maxSpeed: 270, speedStep: 12, baseGap: 140, minGap: 100, gapShrinkPerPoint: 1.5 }
    }
  },

  // Medals (lowest to highest). Set enabled:false to hide.
  medals: {
    enabled: true,
    tiers: [
      { name: 'Bronze',   score: 10, light: '#f3c08f', base: '#cd7f32', dark: '#7a4a1a' },
      { name: 'Silver',   score: 20, light: '#f4f4f4', base: '#bfc5cc', dark: '#6b737c' },
      { name: 'Gold',     score: 30, light: '#fff0a0', base: '#f5c518', dark: '#9a7400' },
      { name: 'Platinum', score: 40, light: '#e9fbff', base: '#8fd6ea', dark: '#3d7f94' }
    ]
  },

  // Levels: the theme changes every `pointsPerLevel` points, cycling through `themes` with a smooth blend.
  // Every theme needs the same colour keys. Per theme: `stars` (0-1) = star visibility, `body` = 'sun' or 'moon',
  // `bodyY` = its height, `ambient` = 'petals' | 'embers' | 'fireflies' | 'dust' | 'snow' | 'none'.
  levels: {
    enabled: true,
    pointsPerLevel: 5,
    transitionSeconds: 1.5,
    bannerSeconds: 1.4,       // how long the "LEVEL n" banner shows
    themes: [
      { name: 'Meadow', stars: 0, body: 'sun', bodyY: 95, ambient: 'petals', colors: {
        sun: '#fff6a8',
        skyTop: '#3aa7e0', skyBottom: '#c4ecf6', cloud: '#ffffff',
        hillFar: '#8fd3b4', hillNear: '#5fbf6a',
        grass: '#7ed957', grassStripe: '#6cc24a', groundEdge: '#3c7a1f',
        dirt: '#ded895', dirtDark: '#c4ba6c',
        pipe: '#73bf2e', pipeLight: '#a8e85e', pipeDark: '#3f7d15', pipeOutline: '#2e4a14' } },
      { name: 'Sunset', stars: 0, body: 'sun', bodyY: 150, ambient: 'embers', colors: {
        sun: '#ff7a3a',
        skyTop: '#5b3a8c', skyBottom: '#ffb26b', cloud: '#ffd9b0',
        hillFar: '#c46a7a', hillNear: '#7a4a6e',
        grass: '#a8a24a', grassStripe: '#948f3e', groundEdge: '#5a5a22',
        dirt: '#d9b07a', dirtDark: '#b88a55',
        pipe: '#c0623a', pipeLight: '#e8905a', pipeDark: '#7a3418', pipeOutline: '#4a1e0c' } },
      { name: 'Night', stars: 1, body: 'moon', bodyY: 85, ambient: 'fireflies', colors: {
        sun: '#f3f0d2',
        skyTop: '#0b1030', skyBottom: '#2f4084', cloud: '#5a6aa0',
        hillFar: '#25456e', hillNear: '#1f5a4a',
        grass: '#2f7d4a', grassStripe: '#276a3e', groundEdge: '#123a22',
        dirt: '#6b6a52', dirtDark: '#4f4e3b',
        pipe: '#3d8a5a', pipeLight: '#66bd8a', pipeDark: '#1d4a30', pipeOutline: '#0f2a1b' } },
      { name: 'Desert', stars: 0, body: 'sun', bodyY: 90, ambient: 'dust', colors: {
        sun: '#fffbd0',
        skyTop: '#4fb3e6', skyBottom: '#fbe3a1', cloud: '#fff5dc',
        hillFar: '#e3b97a', hillNear: '#cf9a52',
        grass: '#d8b95a', grassStripe: '#c8a84a', groundEdge: '#8a6a22',
        dirt: '#ecd29a', dirtDark: '#d2b073',
        pipe: '#4f9a52', pipeLight: '#7fc27f', pipeDark: '#2a5a2e', pipeOutline: '#1a3a1c' } },
      { name: 'Frost', stars: 0, body: 'sun', bodyY: 100, ambient: 'snow', colors: {
        sun: '#ffffff',
        skyTop: '#7fb8e6', skyBottom: '#e6f4ff', cloud: '#ffffff',
        hillFar: '#b9d6ee', hillNear: '#8fb8d8',
        grass: '#e8f4ff', grassStripe: '#d4e8f8', groundEdge: '#7aa0c0',
        dirt: '#c8d8e6', dirtDark: '#a8bccf',
        pipe: '#4aa8c8', pipeLight: '#86d4ea', pipeDark: '#1f6a88', pipeOutline: '#124256' } }
    ]
  },

  sound: { enabled: true, volume: 0.5 },

  // resumeCountdown: seconds of "3-2-1" after un-pausing (0 = resume instantly).
  pause: { enabled: true, autoPauseOnBlur: true, resumeCountdown: 3 },

  // Best score (kept per difficulty), mute and difficulty persistence. Falls back to in-memory if storage fails.
  storage: { enabled: true, key: 'skyFlapper.best', muteKey: 'skyFlapper.muted', difficultyKey: 'skyFlapper.difficulty',
             skinKey: 'skyFlapper.skin', achKey: 'skyFlapper.achievements', statsKey: 'skyFlapper.stats' },

  // Bird skins. `unlock` = id of the achievement that unlocks it (null = always available).
  skins: {
    enabled: true,
    list: [
      { id: 'classic', name: 'Classic', unlock: null,
        body: ['#ffe55c', '#f5a623'], belly: '#fff6c8', wing: '#fff3b0', beak: ['#ff7a1a', '#e85d0a'], outline: '#5a3a12' },
      { id: 'crimson', name: 'Crimson', unlock: null,
        body: ['#ff8a8a', '#d63a3a'], belly: '#ffe0e0', wing: '#ffc4c4', beak: ['#ffb347', '#e08a1a'], outline: '#5a1a1a' },
      { id: 'azure', name: 'Azure', unlock: null,
        body: ['#8fd8ff', '#2f8fe0'], belly: '#e6f6ff', wing: '#c8ecff', beak: ['#ff9a3a', '#e8731a'], outline: '#173a5a' },
      { id: 'mint', name: 'Mint', unlock: null,
        body: ['#b8f5c8', '#3fbf7a'], belly: '#f0fff4', wing: '#d6ffe2', beak: ['#ff8a3a', '#e0661a'], outline: '#1a4a2e' },
      { id: 'ghost', name: 'Ghost', unlock: 'globetrotter',
        body: ['#ffffff', '#c9d3e6'], belly: '#ffffff', wing: '#eef2fb', beak: ['#d9dfee', '#aab4cc'], outline: '#5a6482' },
      { id: 'golden', name: 'Golden', unlock: 'hardhero',
        body: ['#fff3a8', '#e0a800'], belly: '#fffbe0', wing: '#fff0a0', beak: ['#ff9a1a', '#c96a00'], outline: '#6a4a00' }
    ]
  },

  // Power-ups float in the gap of some pipes. Shield = survive one hit, Slow = slower pipes,
  // Double = 2 points per pipe. Set enabled:false to remove them.
  powerups: {
    enabled: true,
    chance: 0.22,              // chance a new pipe carries a power-up
    minScore: 3,               // none before this score
    minPipesBetween: 3,        // at least this many pipes between power-ups
    slowSeconds: 5, slowFactor: 0.6,
    doubleSeconds: 8,
    shieldGrace: 1.2,          // seconds of invulnerability after a shield breaks
    pickupRadius: 13,
    types: ['shield', 'slow', 'double'],
    colors: { shield: '#4aa8ff', slow: '#a566ff', double: '#ffc21a' }
  },

  // Achievements. kind: score | level | hardScore | powerups | shieldSave | games
  achievements: {
    enabled: true,
    toastSeconds: 2.8,
    list: [
      { id: 'first_point',   name: 'First Point',    desc: 'Score your first point',         kind: 'score',      target: 1 },
      { id: 'double_digits', name: 'Double Digits',  desc: 'Score 10 in one run',            kind: 'score',      target: 10 },
      { id: 'high_flyer',    name: 'High Flyer',     desc: 'Score 25 in one run',            kind: 'score',      target: 25 },
      { id: 'globetrotter',  name: 'Globetrotter',   desc: 'Reach level 5',                  kind: 'level',      target: 5 },
      { id: 'hardhero',      name: 'Hard Mode Hero', desc: 'Score 15 on Hard',               kind: 'hardScore',  target: 15 },
      { id: 'collector',     name: 'Collector',      desc: 'Grab 3 power-ups in one run',    kind: 'powerups',   target: 3 },
      { id: 'close_call',    name: 'Close Call',     desc: 'Survive a hit with a shield',    kind: 'shieldSave', target: 1 },
      { id: 'regular',       name: 'Regular',        desc: 'Play 10 games',                  kind: 'games',      target: 10 }
    ]
  },

  // Extra visual polish. Each can be switched off.
  visuals: {
    trail: { enabled: true, length: 0.35 },                 // seconds a trail point lives
    ambient: { enabled: true, max: 50, perSecond: 7 },       // themed floating particles
    celestial: { enabled: true },                            // sun / moon
    waveTitle: true                                          // animated start-screen title
  },

  feedback: {
    shakeTime: 0.35, shakeMagnitude: 9,
    flashTime: 0.22,
    scorePopTime: 0.28, scorePopScale: 0.45,
    flapParticles: 6, hitParticles: 16, maxParticles: 150,
    gameOverPanelDelay: 0.55, restartDelay: 0.6
  },

  ui: { font: '"Trebuchet MS", "Segoe UI", Roboto, Arial, sans-serif' }
};
