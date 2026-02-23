/**
 * Game world state: player, enemies, obstacles, shells.
 */

import { distXZ, angleToXZ, normalizeAngle } from '../core/math.js';
import {
  WORLD_SIZE, OBSTACLE_COUNT, OBSTACLE_SIZE,
  ENEMY_SPAWN_DISTANCE, ENEMY_DESPAWN_DISTANCE,
  TANK_SPEED, TANK_TURN_SPEED, SHELL_SPEED, SHELL_MAX_DIST,
  CANNON_RELOAD_TIME, PLAYER_RADIUS, ENEMY_RADIUS, HIT_RADIUS,
  ENEMY_TANK_SPEED, ENEMY_SUPER_TANK_SPEED, ENEMY_MISSILE_SPEED,
  ENEMY_SAUCER_SPEED, ENEMY_FIRE_INTERVAL, ENEMY_SUPER_FIRE_INTERVAL,
  ENEMY_SHELL_SPEED,
} from '../core/constants.js';

export const enum EnemyType {
  Tank,
  SuperTank,
  Missile,
  Saucer,
}

export interface Obstacle {
  x: number;
  z: number;
  type: 'cube' | 'pyramid';
  size: number;
}

export interface Shell {
  x: number;
  z: number;
  dx: number;
  dz: number;
  dist: number;
  fromPlayer: boolean;
}

export interface Enemy {
  type: EnemyType;
  x: number;
  z: number;
  angle: number;
  alive: boolean;
  fireTimer: number;
}

export interface ExplosionEffect {
  x: number;
  z: number;
  timer: number;
  lines: { angle: number; len: number }[];
}

export class World {
  // Player
  playerX = 0;
  playerZ = 0;
  playerAngle = 0;
  reloadTimer = 0;
  isMoving = false;

  // World objects
  obstacles: Obstacle[] = [];
  enemies: Enemy[] = [];
  shells: Shell[] = [];
  explosions: ExplosionEffect[] = [];

  // Spawning
  spawnTimer = 3.0;
  enemiesKilled = 0;

  // Mountain skyline (generated once)
  mountainProfile: number[] = [];

  constructor() {
    this.generateMountains();
  }

  reset(): void {
    this.playerX = 0;
    this.playerZ = 0;
    this.playerAngle = 0;
    this.reloadTimer = 0;
    this.isMoving = false;
    this.obstacles = [];
    this.enemies = [];
    this.shells = [];
    this.explosions = [];
    this.spawnTimer = 3.0;
    this.enemiesKilled = 0;
    this.generateObstacles();
  }

  private generateMountains(): void {
    // Jagged mountain profile — 120 height values around the horizon
    this.mountainProfile = [];
    const count = 120;
    let h = 20;
    for (let i = 0; i < count; i++) {
      h += (Math.random() - 0.5) * 15;
      h = Math.max(5, Math.min(60, h));
      // Add occasional peaks
      if (Math.random() < 0.08) h = 30 + Math.random() * 40;
      this.mountainProfile.push(h);
    }
  }

  private generateObstacles(): void {
    this.obstacles = [];
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      let x: number, z: number;
      // Keep obstacles away from player spawn
      do {
        x = (Math.random() - 0.5) * WORLD_SIZE * 1.5;
        z = (Math.random() - 0.5) * WORLD_SIZE * 1.5;
      } while (distXZ(x, z, 0, 0) < 100);

      this.obstacles.push({
        x, z,
        type: Math.random() < 0.5 ? 'cube' : 'pyramid',
        size: OBSTACLE_SIZE * (0.7 + Math.random() * 0.6),
      });
    }
  }

  // ── Player controls ─────────────────────────────────────────────

  updatePlayer(dt: number, forward: number, turn: number): void {
    const dtSec = dt / 1000;

    // Turn
    this.playerAngle += turn * TANK_TURN_SPEED * dtSec;
    this.playerAngle = normalizeAngle(this.playerAngle);

    // Move
    this.isMoving = forward !== 0;
    if (forward !== 0) {
      const newX = this.playerX + Math.sin(this.playerAngle) * forward * TANK_SPEED * dtSec;
      const newZ = this.playerZ + Math.cos(this.playerAngle) * forward * TANK_SPEED * dtSec;

      // Check obstacle collision
      if (!this.collidesWithObstacle(newX, newZ, PLAYER_RADIUS)) {
        this.playerX = newX;
        this.playerZ = newZ;
      }
    }

    // Reload timer
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dtSec;
    }
  }

  /** Fire player cannon. Returns true if fired. */
  firePlayerCannon(): boolean {
    if (this.reloadTimer > 0) return false;
    this.reloadTimer = CANNON_RELOAD_TIME;

    const dx = Math.sin(this.playerAngle) * SHELL_SPEED;
    const dz = Math.cos(this.playerAngle) * SHELL_SPEED;
    this.shells.push({
      x: this.playerX,
      z: this.playerZ,
      dx, dz,
      dist: 0,
      fromPlayer: true,
    });
    return true;
  }

  // ── Enemy spawning ──────────────────────────────────────────────

  updateSpawning(dt: number, difficulty: number): void {
    const dtSec = dt / 1000;

    // Only one enemy at a time
    if (this.enemies.some(e => e.alive)) return;

    this.spawnTimer -= dtSec;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy(difficulty);
      this.spawnTimer = Math.max(1.0, 4.0 - difficulty * 0.3);
    }
  }

  private spawnEnemy(difficulty: number): void {
    // Choose enemy type based on difficulty
    let type: EnemyType;
    const roll = Math.random();
    if (difficulty >= 8 && roll < 0.15) {
      type = EnemyType.Saucer;
    } else if (difficulty >= 5 && roll < 0.3) {
      type = EnemyType.Missile;
    } else if (difficulty >= 2 && roll < 0.5) {
      type = EnemyType.SuperTank;
    } else {
      type = EnemyType.Tank;
    }

    // Spawn at random angle from player, at ENEMY_SPAWN_DISTANCE
    const angle = Math.random() * Math.PI * 2;
    const x = this.playerX + Math.sin(angle) * ENEMY_SPAWN_DISTANCE;
    const z = this.playerZ + Math.cos(angle) * ENEMY_SPAWN_DISTANCE;

    this.enemies.push({
      type, x, z,
      angle: angleToXZ(x, z, this.playerX, this.playerZ),
      alive: true,
      fireTimer: type === EnemyType.SuperTank ? ENEMY_SUPER_FIRE_INTERVAL : ENEMY_FIRE_INTERVAL,
    });
  }

  // ── Enemy AI ────────────────────────────────────────────────────

  updateEnemies(dt: number): void {
    const dtSec = dt / 1000;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const dist = distXZ(enemy.x, enemy.z, this.playerX, this.playerZ);
      const toPlayer = angleToXZ(enemy.x, enemy.z, this.playerX, this.playerZ);

      switch (enemy.type) {
        case EnemyType.Tank:
          this.updateEnemyTank(enemy, dtSec, dist, toPlayer, ENEMY_TANK_SPEED, ENEMY_FIRE_INTERVAL);
          break;
        case EnemyType.SuperTank:
          this.updateEnemyTank(enemy, dtSec, dist, toPlayer, ENEMY_SUPER_TANK_SPEED, ENEMY_SUPER_FIRE_INTERVAL);
          break;
        case EnemyType.Missile:
          this.updateMissile(enemy, dtSec, toPlayer);
          break;
        case EnemyType.Saucer:
          this.updateSaucer(enemy, dtSec, dist);
          break;
      }

      // Despawn if too far
      if (dist > ENEMY_DESPAWN_DISTANCE) {
        enemy.alive = false;
      }
    }

    this.enemies = this.enemies.filter(e => e.alive);
  }

  private updateEnemyTank(enemy: Enemy, dtSec: number, dist: number, toPlayer: number, speed: number, fireInterval: number): void {
    // Turn toward player
    const angleDiff = normalizeAngle(toPlayer - enemy.angle);
    enemy.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 1.5 * dtSec);

    // Move toward player (stop at ~150 units)
    if (dist > 150) {
      const newX = enemy.x + Math.sin(enemy.angle) * speed * dtSec;
      const newZ = enemy.z + Math.cos(enemy.angle) * speed * dtSec;
      if (!this.collidesWithObstacle(newX, newZ, ENEMY_RADIUS)) {
        enemy.x = newX;
        enemy.z = newZ;
      }
    }

    // Fire at player
    enemy.fireTimer -= dtSec;
    if (enemy.fireTimer <= 0 && dist < 500) {
      enemy.fireTimer = fireInterval * (0.8 + Math.random() * 0.4);
      const dx = Math.sin(toPlayer) * ENEMY_SHELL_SPEED;
      const dz = Math.cos(toPlayer) * ENEMY_SHELL_SPEED;
      this.shells.push({
        x: enemy.x, z: enemy.z,
        dx, dz, dist: 0, fromPlayer: false,
      });
    }
  }

  private updateMissile(enemy: Enemy, dtSec: number, toPlayer: number): void {
    // Home toward player
    const angleDiff = normalizeAngle(toPlayer - enemy.angle);
    enemy.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 3.0 * dtSec);

    enemy.x += Math.sin(enemy.angle) * ENEMY_MISSILE_SPEED * dtSec;
    enemy.z += Math.cos(enemy.angle) * ENEMY_MISSILE_SPEED * dtSec;
  }

  private updateSaucer(enemy: Enemy, dtSec: number, _dist: number): void {
    // Saucer flies in a straight line across the battlefield
    enemy.x += Math.sin(enemy.angle) * ENEMY_SAUCER_SPEED * dtSec;
    enemy.z += Math.cos(enemy.angle) * ENEMY_SAUCER_SPEED * dtSec;
    // Slight weaving
    enemy.angle += Math.sin(Date.now() * 0.003) * 0.3 * dtSec;
  }

  // ── Shells ──────────────────────────────────────────────────────

  updateShells(dt: number): void {
    const dtSec = dt / 1000;

    for (const shell of this.shells) {
      shell.x += shell.dx * dtSec;
      shell.z += shell.dz * dtSec;
      shell.dist += Math.sqrt(shell.dx * shell.dx + shell.dz * shell.dz) * dtSec;
    }

    // Remove shells that went too far
    this.shells = this.shells.filter(s => s.dist < SHELL_MAX_DIST);
  }

  // ── Collision detection ─────────────────────────────────────────

  /** Check player shells vs enemies. Returns scored enemy type or null. */
  checkPlayerHits(): EnemyType | null {
    for (let si = this.shells.length - 1; si >= 0; si--) {
      const shell = this.shells[si];
      if (!shell.fromPlayer) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (distXZ(shell.x, shell.z, enemy.x, enemy.z) < HIT_RADIUS) {
          // Hit!
          enemy.alive = false;
          this.shells.splice(si, 1);
          this.spawnExplosion(enemy.x, enemy.z);
          this.enemiesKilled++;
          return enemy.type;
        }
      }

      // Shell vs obstacle (just remove shell)
      for (const obs of this.obstacles) {
        if (distXZ(shell.x, shell.z, obs.x, obs.z) < obs.size * 1.2) {
          this.shells.splice(si, 1);
          break;
        }
      }
    }
    return null;
  }

  /** Check enemy shells vs player. Returns true if player is hit. */
  checkEnemyHits(): boolean {
    for (let si = this.shells.length - 1; si >= 0; si--) {
      const shell = this.shells[si];
      if (shell.fromPlayer) continue;

      if (distXZ(shell.x, shell.z, this.playerX, this.playerZ) < HIT_RADIUS) {
        this.shells.splice(si, 1);
        return true;
      }

      // Enemy shell vs obstacle
      for (const obs of this.obstacles) {
        if (distXZ(shell.x, shell.z, obs.x, obs.z) < obs.size * 1.2) {
          this.shells.splice(si, 1);
          break;
        }
      }
    }

    // Missile direct collision
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.type === EnemyType.Missile) {
        if (distXZ(enemy.x, enemy.z, this.playerX, this.playerZ) < HIT_RADIUS * 1.5) {
          enemy.alive = false;
          return true;
        }
      }
    }

    return false;
  }

  // ── Obstacle collision ──────────────────────────────────────────

  private collidesWithObstacle(x: number, z: number, radius: number): boolean {
    for (const obs of this.obstacles) {
      if (distXZ(x, z, obs.x, obs.z) < obs.size + radius) {
        return true;
      }
    }
    return false;
  }

  // ── Explosions ──────────────────────────────────────────────────

  spawnExplosion(x: number, z: number): void {
    const lines: { angle: number; len: number }[] = [];
    for (let i = 0; i < 12; i++) {
      lines.push({
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.3,
        len: 20 + Math.random() * 30,
      });
    }
    this.explosions.push({ x, z, timer: 1.0, lines });
  }

  updateExplosions(dt: number): void {
    const dtSec = dt / 1000;
    for (const exp of this.explosions) {
      exp.timer -= dtSec;
    }
    this.explosions = this.explosions.filter(e => e.timer > 0);
  }
}
