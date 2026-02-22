# Battlezone (1980) -- Comprehensive Technical Reference for TypeScript Recreation

## Historical Context

### Designer and Team
- **Lead Designer/Programmer**: Ed Rotberg, primarily inspired by the top-down shooter *Tank* (1974)
- **Math Box Engineers**: Jed Margolin and Mike Albaugh designed the custom math processor
- **Volcano Programmer**: Owen Rubin coded the erupting volcano animation
- Approximately **13,022 units produced**, MSRP $2,095
- Considered the **first true 3D arcade game with a first-person perspective**

### Original Vector Hardware
- **CPU**: MOS Technology 6502 at 1.512 MHz
- **Display Processor**: Analog Vector Generator (AVG)
- **Math Processor**: "Math Box" built from four AMD Am2901 4-bit bit-slice ALUs
- **Display**: 19-inch green phosphor vector monitor
- **Sound**: POKEY chip (4 voices) + discrete analog circuits + custom DAC
- **Display Resolution**: ~1024x768 addressable
- **Refresh Rate**: 41.7 Hz visual, ~15.625 Hz gameplay update

---

## 3D Engine Details

### Coordinate System
- Center-origin, flat horizontal plane only -- no vertical movement
- 2x2 transformation matrix (reduced from 4x4 since all ground-locked)
- Object positions: 16-bit X/Z coordinates
- Player facing angle: single byte (0-255 = 0-360 degrees)

### Field of View
- Background strip: 4096 units wide, 1024 visible = ~90 degree FOV
- Battlefield objects visible in ~45 degree cone from player facing
- Background scrolls at different rate than foreground (parallax)

### Perspective Projection
- Math Box: multiply two 16-bit values, add, divide by 16-bit, output 16-bit
- Vanishing-point projection

### Clipping and Visibility
- Hardware window circuit blanks out-of-bounds vectors
- 28-object visible list per frame, sorted by Z-distance
- Intensity-based distance fading for depth perception

### Object Definitions
- 44 total object definitions in ROM
- Each: vertex list (16-bit X/Y/Z) + drawing command list
- Max 32 vertices per object (5-bit index)

---

## Visual Design

### Color and Display
- Monochromatic green lines (#00FF00) on black (#000000)
- Red overlay zone (#FF0000) for HUD/radar (top ~1/5 of screen)

### Landscape
- Mountains: jagged horizon silhouette as connected line segments
- Erupting volcano with particle effects
- Crescent moon on horizon

### Obstacles (21 fixed positions)
- Narrow Pyramid, Wide Pyramid, Tall Box/Cube, Short Box
- Indestructible, block movement and projectiles for both player and enemies

### HUD Layout
- Score (left), High score (center), Lives as tank icons (right)
- Circular radar display (center-top): sweeping line, enemy blips, FOV wedge
- Saucers do NOT appear on radar
- Crosshair/gunsight at viewport center (flashes when shell in flight)

### Wireframe Models
- **Slow Tank**: Rectangular body, animated treads, rotating radar dish
- **Super Tank**: Wedge-shaped body, no tread animation, stationary antenna
- **Missile**: Two hexagonal cross-sections, pedestal base, top crest
- **Saucer**: Two concentric octagons with connected vertices, spins on axis

### Effects
- Explosion: 6 wireframe chunks spin outward with TTL
- Player death: "cracked glass" viewport animation
- Horizon drop on impact (screen shake)

---

## Game Mechanics

### Controls
- Original: Two joysticks (differential tank steering)
- Modern mapping: WASD movement, mouse/arrows for turning, spacebar to fire

### Shooting
- Single shot only -- one projectile at a time
- ~2 second flight time, gunsight flashes while shell active
- 2-second spawn protection (no firing)

### Scoring
| Enemy | Points |
|-------|--------|
| Slow Tank | 1,000 |
| Guided Missile | 2,000 |
| Super Tank | 3,000 |
| Saucer/UFO | 5,000 |

- 1812 Overture at 100,000 points
- Score rolls over at 10,000,000

### Lives & Bonus
- Default 3 lives (configurable 2-5)
- Bonus at 15,000 and 100,000 (configurable)
- Additional bonus every 100,000 after first 100K

### Difficulty Progression
1. Only slow tanks initially
2. Saucers at 2,000+ points (0-17 second random delay)
3. Missiles at 10,000 points (configurable)
4. Super tanks replace slow tanks after 6th missile
5. Idle punishment: missile spawns after 48-64 seconds of evasion
6. Enemy aggression increases by 1,000 points per player death

---

## Enemy AI

### General Rules
- Only ONE hostile enemy at a time
- 2-second spawn protection (cannot fire)
- Spawn distance: 50/50 near ($2FFF) or far ($5FFF)

### Standard Slow Tank (1,000 pts)
- Moves slowly toward player, periodically changes heading
- Fires when aligned within ~2.8 degrees of player
- Aggression ramps up over ~17 seconds after spawn
- Animated treads and rotating radar dish

### Super Tank (3,000 pts)
- Faster, more aggressive, more accurate
- Wedge-shaped, visually distinct
- Appears after 6th missile in game

### Guided Missiles (2,000 pts)
- Homing: actively tracks player
- Flies over obstacles (unlike tanks)
- Evasive swerving, timing varies with difficulty
- Always spawns at far distance

### Saucers/UFOs (5,000 pts)
- Non-hostile (do NOT fire)
- Not on radar (audio cue only)
- Random movement, spinning, flies above obstacles
- Appear at 2,000+ points with random delays

---

## Audio (Web Audio Recreation Guide)

| Sound | Implementation |
|-------|---------------|
| Engine idle | Low-freq oscillator (~40-60 Hz), square/sawtooth mix |
| Engine fast | Same shifted higher (~80-120 Hz) |
| Cannon fire | Short white noise burst with pitch-down sweep, ~200ms |
| Explosion | Longer white noise (~1s), low-pass filtered, volume decay |
| Radar ping | Short sine blip (~1000 Hz, ~50ms) |
| New enemy alert | Three descending tones |
| Extra life | Four ascending beeps |
| Saucer hovering | Warbling oscillating frequency |
| Object bump | Brief low thud |
| 1812 Overture | 9-note square wave sequence |

---

## Game Flow

### Attract Mode
1. High score display (tank symbol for 100K+ scorers)
2. "Battlezone" wireframe logo
3. Demo gameplay
4. Cycle back

### Gameplay Loop
1. Player spawns at origin
2. One enemy at a time, continuous spawning
3. Score-based difficulty escalation
4. Player death → cracked glass animation → respawn
5. Game over → initials entry if qualifying

---

## Key Constants

| Constant | Value |
|----------|-------|
| FOV | ~90 degrees |
| Near spawn | $2FFF (~12,287 units) |
| Far spawn | $5FFF (~24,575 units) |
| Spawn protection | 2 seconds |
| Aggression ramp | ~17 seconds |
| Idle punishment | 48-64 seconds |
| Max visible objects | 28 |
| Max vertices/object | 32 |
| Obstacle count | 21 |
| Shell flight time | ~2 seconds |
| Firing alignment | ~2.8 degrees |
| Player angle resolution | 256 values |
