# Contributing

Thanks for your interest in Sky Flapper! Bug reports, ideas and pull requests are welcome.

## Run it locally

There is no build step and no dependencies.

- Open `index.html` in a browser, or
- serve the folder, for example `python3 -m http.server 8000`, then visit `http://localhost:8000`.

## Code layout

| File | What it holds |
| --- | --- |
| `js/config.js` | The single `CONFIG` object with every tunable value |
| `js/state.js` | Shared state, theme blending, persistence helpers |
| `js/audio.js` | Web Audio sound effects |
| `js/features.js` | Bird skins, power-ups, achievements |
| `js/input.js` | Keyboard, mouse and touch input |
| `js/update.js` | Per-frame game logic |
| `js/collision.js` | Collision checks |
| `js/render.js` | World drawing (sky, hills, pipes, bird, particles) |
| `js/ui.js` | HUD, menus and overlays |
| `js/main.js` | Resize handling, event wiring and the main loop |

The files are plain scripts (not ES modules) so the game also runs when opened straight from disk. They share one global scope, and the load order in `index.html` matters.

## Guidelines

- Keep it dependency-free: no libraries, CDNs, images or audio files.
- Put new tunable numbers and colors in `CONFIG`, and give new features an `enabled` flag where it makes sense.
- Use delta time for anything that moves, so speed is the same on 60 Hz and 144 Hz screens.
- Wrap `localStorage` access in try/catch (see `lsGet` / `lsSet`).

## Before opening a pull request

1. Run `node --check` on every file in `js/`.
2. Play a few runs and check the browser console for errors. Try start, play, pause, die and restart several times in a row.
3. Check keyboard, mouse and touch input, and resize the window mid-game.
4. Describe what changed and why in the pull request.
