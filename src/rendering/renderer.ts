/**
 * Battlezone renderer — green wireframe 3D on black background.
 * Draws the first-person view, radar, crosshair, HUD, and special screens.
 */

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE, HORIZON_Y,
  RADAR_X, RADAR_Y, RADAR_RADIUS, RADAR_RANGE, COLORS,
} from '../core/constants.js';
import { Vec3, Vec2, project, worldToCamera, distXZ } from '../core/math.js';
import { World, EnemyType, Enemy, Obstacle, Shell } from '../world/world.js';
import { WireframeModel, tankModel, cubeModel, pyramidModel, missileModel, saucerModel } from '../world/objects.js';

// Pre-build models
const TANK_MODEL = tankModel();
const CUBE_MODEL = cubeModel(1);
const PYRAMID_MODEL = pyramidModel(1);
const MISSILE_MODEL = missileModel();
const SAUCER_MODEL = saucerModel();

interface DrawableObject {
  dist: number;
  draw: () => void;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ── Main gameplay render ────────────────────────────────────────

  renderPlaying(world: World, score: number, highScore: number, lives: number, cannonReady: boolean): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ground grid lines
    this.drawGround(world);

    // Mountains
    this.drawMountains(world);

    // Collect all objects for depth sorting
    const drawables: DrawableObject[] = [];

    // Obstacles
    for (const obs of world.obstacles) {
      const dist = distXZ(obs.x, obs.z, world.playerX, world.playerZ);
      if (dist > 800) continue;
      drawables.push({
        dist,
        draw: () => this.drawObstacle(obs, world),
      });
    }

    // Enemies
    for (const enemy of world.enemies) {
      if (!enemy.alive) continue;
      const dist = distXZ(enemy.x, enemy.z, world.playerX, world.playerZ);
      if (dist > 800) continue;
      drawables.push({
        dist,
        draw: () => this.drawEnemy(enemy, world),
      });
    }

    // Shells
    for (const shell of world.shells) {
      const dist = distXZ(shell.x, shell.z, world.playerX, world.playerZ);
      if (dist > 800) continue;
      drawables.push({
        dist,
        draw: () => this.drawShell(shell, world),
      });
    }

    // Explosions
    for (const exp of world.explosions) {
      const dist = distXZ(exp.x, exp.z, world.playerX, world.playerZ);
      drawables.push({
        dist,
        draw: () => this.drawExplosion(exp, world),
      });
    }

    // Sort back-to-front (painter's algorithm)
    drawables.sort((a, b) => b.dist - a.dist);
    for (const d of drawables) {
      d.draw();
    }

    // Crosshair
    this.drawCrosshair();

    // HUD
    this.drawHud(score, highScore, lives, cannonReady);

    // Radar
    this.drawRadar(world);
  }

  // ── Ground ──────────────────────────────────────────────────────

  private drawGround(world: World): void {
    const { ctx } = this;

    // Draw ground grid lines
    ctx.strokeStyle = COLORS.wireframeVeryDim;
    ctx.lineWidth = 1;

    const gridSpacing = 100;
    const numLines = 10;

    for (let i = -numLines; i <= numLines; i++) {
      // Lines parallel to X axis
      const worldZ = Math.round(world.playerZ / gridSpacing) * gridSpacing + i * gridSpacing;
      const left = worldToCamera({ x: world.playerX - 600, y: 0, z: worldZ }, world.playerX, world.playerZ, world.playerAngle);
      const right = worldToCamera({ x: world.playerX + 600, y: 0, z: worldZ }, world.playerX, world.playerZ, world.playerAngle);

      const sl = project(left);
      const sr = project(right);
      if (sl && sr && (left.z > 1 || right.z > 1)) {
        // Clip to positive Z
        if (left.z > 1 && right.z > 1) {
          ctx.beginPath();
          ctx.moveTo(sl.x, sl.y);
          ctx.lineTo(sr.x, sr.y);
          ctx.stroke();
        }
      }
    }
  }

  // ── Mountains ───────────────────────────────────────────────────

  private drawMountains(world: World): void {
    const { ctx } = this;
    const profile = world.mountainProfile;
    const count = profile.length;

    ctx.strokeStyle = COLORS.mountains;
    ctx.lineWidth = 1.5 * RENDER_SCALE;

    ctx.beginPath();
    // Draw mountain silhouette along the horizon
    for (let i = 0; i <= count; i++) {
      const frac = i / count;
      const worldAngle = frac * Math.PI * 2;
      const relAngle = worldAngle - world.playerAngle;
      // Map to screen X
      const screenX = CANVAS_WIDTH * 0.5 + (relAngle / (Math.PI * 0.5)) * CANVAS_WIDTH * 0.5;

      // Handle wrapping — draw multiple passes
      const height = profile[i % count] * RENDER_SCALE * 0.6;
      const screenY = HORIZON_Y - height;

      for (let wrap = -1; wrap <= 1; wrap++) {
        const sx = screenX + wrap * CANVAS_WIDTH * 2;
        if (sx < -100 || sx > CANVAS_WIDTH + 100) continue;
        if (i === 0 || (wrap !== 0 && i === 0)) {
          ctx.moveTo(sx, screenY);
        } else {
          ctx.lineTo(sx, screenY);
        }
      }
    }
    ctx.stroke();

    // Horizon line
    ctx.strokeStyle = COLORS.wireframeDim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
    ctx.stroke();
  }

  // ── 3D wireframe drawing ────────────────────────────────────────

  private drawWireframeAt(
    model: WireframeModel,
    worldX: number, worldZ: number, worldAngle: number,
    scale: number,
    world: World,
    color: string,
  ): void {
    const { ctx } = this;
    const cosA = Math.cos(worldAngle);
    const sinA = Math.sin(worldAngle);

    // Transform vertices to camera space and project
    const projected: (Vec2 | null)[] = [];
    for (const v of model.vertices) {
      // Rotate vertex by object angle
      const rx = v.x * cosA + v.z * sinA;
      const rz = -v.x * sinA + v.z * cosA;

      const worldPos: Vec3 = {
        x: worldX + rx * scale,
        y: v.y * scale,
        z: worldZ + rz * scale,
      };
      const cam = worldToCamera(worldPos, world.playerX, world.playerZ, world.playerAngle);
      projected.push(project(cam));
    }

    // Draw edges
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * RENDER_SCALE;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    for (const edge of model.edges) {
      const a = projected[edge.a];
      const b = projected[edge.b];
      if (!a || !b) continue;

      // Clip to screen roughly
      if (a.x < -200 && b.x < -200) continue;
      if (a.x > CANVAS_WIDTH + 200 && b.x > CANVAS_WIDTH + 200) continue;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  private drawObstacle(obs: Obstacle, world: World): void {
    const model = obs.type === 'cube' ? CUBE_MODEL : PYRAMID_MODEL;
    const dist = distXZ(obs.x, obs.z, world.playerX, world.playerZ);
    const color = dist < 300 ? COLORS.wireframe : COLORS.wireframeDim;
    this.drawWireframeAt(model, obs.x, obs.z, 0, obs.size, world, color);
  }

  private drawEnemy(enemy: Enemy, world: World): void {
    let model: WireframeModel;
    let scale = 1;
    switch (enemy.type) {
      case EnemyType.Tank:
      case EnemyType.SuperTank:
        model = TANK_MODEL;
        break;
      case EnemyType.Missile:
        model = MISSILE_MODEL;
        scale = 1.5;
        break;
      case EnemyType.Saucer:
        model = SAUCER_MODEL;
        break;
    }
    const color = enemy.type === EnemyType.SuperTank ? COLORS.wireframeBright : COLORS.wireframe;
    this.drawWireframeAt(model, enemy.x, enemy.z, enemy.angle, scale, world, color);
  }

  private drawShell(shell: Shell, world: World): void {
    const cam = worldToCamera(
      { x: shell.x, y: 8, z: shell.z },
      world.playerX, world.playerZ, world.playerAngle,
    );
    const p = project(cam);
    if (!p) return;

    const { ctx } = this;
    const size = Math.max(2, 6 * RENDER_SCALE * (1 / (cam.z * 0.01 + 1)));
    ctx.fillStyle = shell.fromPlayer ? COLORS.shell : COLORS.hudRed;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    ctx.shadowBlur = 0;
  }

  private drawExplosion(exp: { x: number; z: number; timer: number; lines: { angle: number; len: number }[] }, world: World): void {
    const cam = worldToCamera(
      { x: exp.x, y: 10, z: exp.z },
      world.playerX, world.playerZ, world.playerAngle,
    );
    const center = project(cam);
    if (!center) return;

    const { ctx } = this;
    const progress = 1 - exp.timer;
    const alpha = Math.max(0, exp.timer);
    const scale = 1 / (cam.z * 0.005 + 1);

    ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
    ctx.lineWidth = 2 * RENDER_SCALE;
    ctx.shadowColor = COLORS.explosion;
    ctx.shadowBlur = 8 * alpha;

    for (const line of exp.lines) {
      const r1 = progress * line.len * RENDER_SCALE * scale * 0.3;
      const r2 = progress * line.len * RENDER_SCALE * scale;
      ctx.beginPath();
      ctx.moveTo(
        center.x + Math.cos(line.angle) * r1,
        center.y + Math.sin(line.angle) * r1,
      );
      ctx.lineTo(
        center.x + Math.cos(line.angle) * r2,
        center.y + Math.sin(line.angle) * r2,
      );
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── Crosshair ───────────────────────────────────────────────────

  private drawCrosshair(): void {
    const { ctx } = this;
    const cx = CANVAS_WIDTH * 0.5;
    const cy = HORIZON_Y;
    const gap = 12 * RENDER_SCALE;
    const len = 20 * RENDER_SCALE;

    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 2 * RENDER_SCALE;
    ctx.shadowColor = COLORS.crosshair;
    ctx.shadowBlur = 3;

    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + len, cy);
    ctx.stroke();

    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(cx, cy - gap - len);
    ctx.lineTo(cx, cy - gap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // ── Radar ───────────────────────────────────────────────────────

  private drawRadar(world: World): void {
    const { ctx } = this;

    // Radar circle background
    ctx.strokeStyle = COLORS.radarBorder;
    ctx.lineWidth = 2 * RENDER_SCALE;
    ctx.beginPath();
    ctx.arc(RADAR_X, RADAR_Y, RADAR_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Radar fill (very dim)
    ctx.fillStyle = 'rgba(0, 40, 0, 0.5)';
    ctx.fill();

    // Player dot (center)
    ctx.fillStyle = COLORS.radarPlayer;
    const playerTriSize = 4 * RENDER_SCALE;
    ctx.beginPath();
    ctx.moveTo(RADAR_X, RADAR_Y - playerTriSize);
    ctx.lineTo(RADAR_X - playerTriSize * 0.6, RADAR_Y + playerTriSize * 0.5);
    ctx.lineTo(RADAR_X + playerTriSize * 0.6, RADAR_Y + playerTriSize * 0.5);
    ctx.closePath();
    ctx.fill();

    // Enemies
    for (const enemy of world.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - world.playerX;
      const dz = enemy.z - world.playerZ;

      // Rotate by player angle
      const cos = Math.cos(-world.playerAngle);
      const sin = Math.sin(-world.playerAngle);
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;

      const sx = RADAR_X + (rx / RADAR_RANGE) * RADAR_RADIUS;
      const sy = RADAR_Y - (rz / RADAR_RANGE) * RADAR_RADIUS;

      if (distXZ(sx, sy, RADAR_X, RADAR_Y) > RADAR_RADIUS - 3) continue;

      ctx.fillStyle = COLORS.radarEnemy;
      ctx.fillRect(sx - 2 * RENDER_SCALE, sy - 2 * RENDER_SCALE, 4 * RENDER_SCALE, 4 * RENDER_SCALE);
    }

    // Obstacles
    for (const obs of world.obstacles) {
      const dx = obs.x - world.playerX;
      const dz = obs.z - world.playerZ;
      const cos = Math.cos(-world.playerAngle);
      const sin = Math.sin(-world.playerAngle);
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;

      const sx = RADAR_X + (rx / RADAR_RANGE) * RADAR_RADIUS;
      const sy = RADAR_Y - (rz / RADAR_RANGE) * RADAR_RADIUS;

      if (distXZ(sx, sy, RADAR_X, RADAR_Y) > RADAR_RADIUS - 3) continue;

      ctx.fillStyle = COLORS.radarObstacle;
      ctx.fillRect(sx - 1.5 * RENDER_SCALE, sy - 1.5 * RENDER_SCALE, 3 * RENDER_SCALE, 3 * RENDER_SCALE);
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────

  private drawHud(score: number, highScore: number, lives: number, cannonReady: boolean): void {
    const { ctx } = this;
    const fontSize = 14 * RENDER_SCALE;
    const smallFontSize = 10 * RENDER_SCALE;
    const pad = 8 * RENDER_SCALE;

    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 0;

    // Score — top-left
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(score.toString().padStart(7, '0'), pad, pad);

    // High score — top-right
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.wireframeDim;
    ctx.font = `bold ${smallFontSize}px "Courier New", monospace`;
    ctx.fillText(`HI ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH - pad, pad);

    // Lives — bottom-left as tank icons
    ctx.font = `bold ${smallFontSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    for (let i = 0; i < Math.min(lives, 5); i++) {
      const x = pad + i * 25 * RENDER_SCALE;
      const y = CANVAS_HEIGHT - 20 * RENDER_SCALE;
      ctx.fillText('\u25AE', x, y); // small rectangle for tank icon
    }

    // Cannon reload indicator
    if (!cannonReady) {
      ctx.fillStyle = COLORS.hudRed;
      ctx.textAlign = 'center';
      ctx.font = `bold ${smallFontSize}px "Courier New", monospace`;
      ctx.fillText('RELOAD', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT - 20 * RENDER_SCALE);
    }
  }

  // ── Damage flash ────────────────────────────────────────────────

  renderDamageFlash(alpha: number): void {
    const { ctx } = this;
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.4})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Cracked viewport lines
    if (alpha > 0.3) {
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.lineWidth = 2 * RENDER_SCALE;
      const cx = CANVAS_WIDTH * 0.5 + (Math.random() - 0.5) * 100;
      const cy = CANVAS_HEIGHT * 0.4;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const len = 60 + Math.random() * 120;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle) * len * RENDER_SCALE,
          cy + Math.sin(angle) * len * RENDER_SCALE,
        );
        ctx.stroke();
      }
    }
  }

  // ── Attract mode ────────────────────────────────────────────────

  renderAttract(highScore: number, time: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    const titleFontSize = 40 * RENDER_SCALE;
    ctx.font = `bold ${titleFontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.wireframe;
    ctx.shadowColor = COLORS.wireframe;
    ctx.shadowBlur = 12;
    ctx.fillText('BATTLEZONE', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.28);
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.3;
    ctx.fillText('BATTLEZONE', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.28);
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // Rotating tank wireframe preview
    this.drawRotatingTank(time);

    // High score
    const scoreFontSize = 14 * RENDER_SCALE;
    ctx.font = `bold ${scoreFontSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.wireframeDim;
    ctx.fillText(`HIGH SCORE  ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.65);

    // Blink prompt
    if (Math.sin(time * 4) > 0) {
      ctx.fillStyle = COLORS.wireframe;
      ctx.shadowColor = COLORS.wireframe;
      ctx.shadowBlur = 4;
      ctx.fillText('PRESS ANY KEY TO START', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.78);
      ctx.shadowBlur = 0;
    }

    // Copyright
    const smallFontSize = 10 * RENDER_SCALE;
    ctx.font = `${smallFontSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.wireframeDim;
    ctx.fillText('\u00A9 1980 ATARI', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.90);
  }

  private drawRotatingTank(time: number): void {
    const { ctx } = this;
    const model = TANK_MODEL;
    const angle = time * 0.5;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const cx = CANVAS_WIDTH * 0.5;
    const cy = CANVAS_HEIGHT * 0.48;
    const scale = 3 * RENDER_SCALE;

    ctx.strokeStyle = COLORS.wireframe;
    ctx.lineWidth = 2 * RENDER_SCALE;
    ctx.shadowColor = COLORS.wireframe;
    ctx.shadowBlur = 4;

    for (const edge of model.edges) {
      const va = model.vertices[edge.a];
      const vb = model.vertices[edge.b];

      // Simple orthographic rotation for preview
      const ax = (va.x * cosA + va.z * sinA) * scale + cx;
      const ay = cy - (va.y + va.x * sinA * 0.3) * scale;
      const bx = (vb.x * cosA + vb.z * sinA) * scale + cx;
      const by = cy - (vb.y + vb.x * sinA * 0.3) * scale;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── Game over ───────────────────────────────────────────────────

  renderGameOver(score: number, highScore: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const titleFontSize = 32 * RENDER_SCALE;
    ctx.font = `bold ${titleFontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.hudRed;
    ctx.shadowColor = COLORS.hudRed;
    ctx.shadowBlur = 10;
    ctx.fillText('GAME OVER', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.32);
    ctx.shadowBlur = 0;

    const scoreFontSize = 16 * RENDER_SCALE;
    ctx.font = `bold ${scoreFontSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.wireframe;
    ctx.fillText(`SCORE  ${score.toString().padStart(7, '0')}`, CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.48);

    const isNewHigh = score >= highScore && score > 0;
    ctx.fillStyle = isNewHigh ? '#FFFF00' : COLORS.wireframeDim;
    if (isNewHigh) {
      ctx.fillText('NEW HIGH SCORE!', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.58);
    } else {
      ctx.fillText(`HIGH   ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.58);
    }

    const smallFontSize = 12 * RENDER_SCALE;
    ctx.font = `bold ${smallFontSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.wireframe;
    ctx.fillText('PRESS ANY KEY', CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.72);
  }
}
