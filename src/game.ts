import { StateMachine } from './states/state-machine.js';
import { InputManager } from './core/input.js';
import { SoundManager } from './systems/sound.js';
import { Renderer } from './rendering/renderer.js';
import { World, EnemyType } from './world/world.js';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FRAME_TIME,
  SCORE_TANK, SCORE_SUPER_TANK, SCORE_MISSILE, SCORE_SAUCER,
  SCORE_EXTRA_LIFE_1, SCORE_EXTRA_LIFE_2,
} from './core/constants.js';

const STORAGE_KEY = 'battlezone_high_score';

type GameStateKey = 'attract' | 'playing' | 'death' | 'gameOver';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input: InputManager;
  readonly sound: SoundManager;
  readonly renderer: Renderer;
  readonly fsm: StateMachine<GameStateKey, Game>;

  // World
  world = new World();

  // Scoring / lives
  score = 0;
  highScore = 0;
  lives = 3;
  earnedExtraLife1 = false;
  earnedExtraLife2 = false;

  // Difficulty rises with kills
  get difficulty(): number {
    return Math.floor(this.world.enemiesKilled / 3);
  }

  // State timers
  stateTimer = 0;
  attractTime = 0;
  damageFlash = 0;

  // Fixed timestep
  private lastTime = 0;
  private accumulator = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.renderer = new Renderer(this.ctx);
    this.fsm = new StateMachine<GameStateKey, Game>(this);

    this.highScore = this.loadHighScore();

    this.registerStates();
    this.scaleCanvas();
    window.addEventListener('resize', () => this.scaleCanvas());

    this.fsm.transition('attract');
    requestAnimationFrame((t) => this.loop(t));
  }

  // ── High score persistence ──────────────────────────────────────

  private loadHighScore(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.highScore.toString());
    } catch { /* ignore */ }
  }

  // ── Scoring ─────────────────────────────────────────────────────

  addScore(points: number): void {
    const oldScore = this.score;
    this.score += points;
    if (this.score > 9999999) this.score = 9999999;

    // Extra life at 15,000
    if (!this.earnedExtraLife1 && oldScore < SCORE_EXTRA_LIFE_1 && this.score >= SCORE_EXTRA_LIFE_1) {
      this.earnedExtraLife1 = true;
      this.lives++;
      this.sound.playExtraLife();
    }

    // Extra life at 100,000
    if (!this.earnedExtraLife2 && oldScore < SCORE_EXTRA_LIFE_2 && this.score >= SCORE_EXTRA_LIFE_2) {
      this.earnedExtraLife2 = true;
      this.lives++;
      this.sound.playExtraLife();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  private scoreForEnemyType(type: EnemyType): number {
    switch (type) {
      case EnemyType.Tank: return SCORE_TANK;
      case EnemyType.SuperTank: return SCORE_SUPER_TANK;
      case EnemyType.Missile: return SCORE_MISSILE;
      case EnemyType.Saucer: return SCORE_SAUCER;
    }
  }

  // ── New game ────────────────────────────────────────────────────

  startNewGame(): void {
    this.score = 0;
    this.lives = 3;
    this.earnedExtraLife1 = false;
    this.earnedExtraLife2 = false;
    this.damageFlash = 0;
    this.world.reset();
  }

  // ── Input handling during gameplay ──────────────────────────────

  private handlePlayingInput(dt: number): void {
    const dtSec = dt / 1000;

    // Turn left/right
    let turn = 0;
    if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA')) {
      turn = -1;
    } else if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD')) {
      turn = 1;
    }

    // Forward/backward
    let forward = 0;
    if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) {
      forward = 1;
    } else if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) {
      forward = -1;
    }

    this.world.updatePlayer(dt, forward, turn);

    // Engine sound
    if (forward !== 0 || turn !== 0) {
      this.sound.startEngine(forward !== 0);
    } else {
      this.sound.startEngine(false);
    }

    // Fire cannon
    if (this.input.isAnyKeyPressed('Space')) {
      if (this.world.firePlayerCannon()) {
        this.sound.playCannon();
      }
    }

    // Mute toggle
    if (this.input.isAnyKeyPressed('KeyM')) {
      this.sound.toggleMute();
      if (this.sound.isMuted()) {
        this.sound.stopEngine();
      }
    }

    // Damage flash fade
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dtSec * 2);
    }
  }

  // ── State registration ──────────────────────────────────────────

  private registerStates(): void {
    // ── Attract ──────────────────────
    this.fsm.register('attract', {
      enter: (g) => {
        g.attractTime = 0;
        g.sound.stopAllLoops();
      },
      update: (g, dt) => {
        g.attractTime += dt / 1000;
        if (g.input.isAnyKeyPressed()) {
          g.sound.ensureContext();
          g.startNewGame();
          g.fsm.transition('playing');
        }
      },
      render: (g) => {
        g.renderer.renderAttract(g.highScore, g.attractTime);
      },
    });

    // ── Playing ──────────────────────
    this.fsm.register('playing', {
      enter: (g) => {
        g.sound.startEngine(false);
      },
      update: (g, dt) => {
        // Input
        g.handlePlayingInput(dt);

        // Enemy spawning
        g.world.updateSpawning(dt, g.difficulty);

        // Enemy AI
        g.world.updateEnemies(dt);

        // Shell movement
        g.world.updateShells(dt);

        // Player hit detection
        const hitType = g.world.checkPlayerHits();
        if (hitType !== null) {
          g.addScore(g.scoreForEnemyType(hitType));
          g.sound.playExplosion();
        }

        // Enemy hit on player
        if (g.world.checkEnemyHits()) {
          g.sound.playDeath();
          g.sound.stopEngine();
          g.damageFlash = 1.0;
          g.fsm.transition('death');
          return;
        }

        // Explosions
        g.world.updateExplosions(dt);

        // Play enemy cannon sound when new enemy shells appear
        // (handled in world.ts firing logic; sound triggered from here is optional)
      },
      render: (g) => {
        g.renderer.renderPlaying(
          g.world,
          g.score,
          g.highScore,
          g.lives,
          g.world.reloadTimer <= 0,
        );

        // Damage flash overlay
        if (g.damageFlash > 0) {
          g.renderer.renderDamageFlash(g.damageFlash);
        }
      },
    });

    // ── Death ────────────────────────
    this.fsm.register('death', {
      enter: (g) => {
        g.stateTimer = 0;
        g.world.spawnExplosion(g.world.playerX, g.world.playerZ);
      },
      update: (g, dt) => {
        g.stateTimer += dt;
        g.world.updateExplosions(dt);

        // Damage flash fade during death
        if (g.damageFlash > 0) {
          g.damageFlash = Math.max(0, g.damageFlash - (dt / 1000) * 1.5);
        }

        if (g.stateTimer >= 2500) {
          g.lives--;
          if (g.lives <= 0) {
            g.fsm.transition('gameOver');
          } else {
            // Respawn: reset world but keep score/kills
            const kills = g.world.enemiesKilled;
            g.world.reset();
            g.world.enemiesKilled = kills;
            g.damageFlash = 0;
            g.fsm.transition('playing');
          }
        }
      },
      render: (g) => {
        g.renderer.renderPlaying(
          g.world,
          g.score,
          g.highScore,
          g.lives,
          false,
        );
        g.renderer.renderDamageFlash(Math.max(g.damageFlash, 0.2));
      },
    });

    // ── Game Over ────────────────────
    this.fsm.register('gameOver', {
      enter: (g) => {
        g.stateTimer = 0;
        g.sound.stopAllLoops();
      },
      update: (g, dt) => {
        g.stateTimer += dt;
        if (g.stateTimer >= 2000 && g.input.isAnyKeyPressed()) {
          g.fsm.transition('attract');
        }
      },
      render: (g) => {
        g.renderer.renderGameOver(g.score, g.highScore);
      },
    });
  }

  // ── Canvas scaling ──────────────────────────────────────────────

  private scaleCanvas(): void {
    const scaleX = window.innerWidth / this.canvas.width;
    const scaleY = window.innerHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY);
    this.canvas.style.width = `${this.canvas.width * scale}px`;
    this.canvas.style.height = `${this.canvas.height * scale}px`;
  }

  // ── Main loop ───────────────────────────────────────────────────

  private loop(time: number): void {
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += Math.min(delta, 100);

    while (this.accumulator >= FRAME_TIME) {
      this.fsm.update(FRAME_TIME);
      this.input.endFrame();
      this.accumulator -= FRAME_TIME;
    }

    this.fsm.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}
