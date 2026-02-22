# CLAUDE.md

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # TypeScript compile + Vite bundle to /dist
npm run preview      # Preview production build locally
```

There are no tests or linting configured.

## Architecture

Battlezone (1980) arcade clone built with **TypeScript + Canvas 2D** wireframe 3D rendering. Zero external runtime dependencies — all graphics drawn procedurally, all sounds synthesized via Web Audio API.

### Entry Flow

`index.html` → `src/main.ts` → `Game` constructor → FSM starts at `Attract` state → `requestAnimationFrame` loop.

### Core Game Loop

Fixed-timestep accumulator pattern: physics update at locked 60 FPS (16.67ms) while rendering runs at display refresh rate.

### Key Modules

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Constants, enums, input handling (dual-stick tank controls), math utilities, 3D vector/matrix |
| `src/entities/` | Player tank, enemy tanks (Standard, Super), Missiles, Saucers, obstacles (cubes, pyramids) |
| `src/world/` | 3D world state, object spawning, collision detection, radar |
| `src/rendering/` | Wireframe 3D renderer — perspective projection, clipping, green vector lines, red HUD overlay |
| `src/systems/` | Level configs, sound manager, scoring |
| `src/states/` | FSM: Attract, Ready, Playing, Death, GameOver |

### Rendering

Canvas 2D wireframe 3D with green-on-black aesthetic. Perspective projection with ~90° FOV. Red overlay zone for HUD (periscope, radar, score). Cracked-glass death effect.

### Gameplay

- Dual-stick tank controls (WASD movement + arrows or mouse for turret)
- Single-shot cannon with 2-second reload
- Only 1 enemy active at a time
- 4 enemy types: Standard Tank (1000), Super Tank (3000), Missile (2000), Saucer (5000)
- Radar display shows enemy positions
- Obstacles provide cover (cubes, pyramids)

## TypeScript Conventions

- **Strict mode** with `noUnusedLocals` and `noUnusedParameters`
- Zero use of `any`
- ES2022 target, ESNext modules, bundler resolution
- All imports use `.js` extensions for ESM compatibility
