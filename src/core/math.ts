/** 3D vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 2D screen point */
export interface Vec2 {
  x: number;
  y: number;
}

/** Wireframe edge: indices into a vertex array */
export interface Edge {
  a: number;
  b: number;
}

import { FOCAL_LENGTH, CANVAS_WIDTH, HORIZON_Y } from './constants.js';

/**
 * Project a 3D world point to 2D screen coordinates.
 * The camera is at the origin looking along +Z by default.
 * Points must be in camera-relative coordinates.
 * Returns null if the point is behind the camera.
 */
export function project(p: Vec3): Vec2 | null {
  if (p.z <= 1) return null; // behind camera
  return {
    x: CANVAS_WIDTH * 0.5 + (FOCAL_LENGTH * p.x) / p.z,
    y: HORIZON_Y - (FOCAL_LENGTH * p.y) / p.z,
  };
}

/** Transform a world-space point into camera-relative space */
export function worldToCamera(
  worldPos: Vec3,
  camX: number,
  camZ: number,
  camAngle: number,
): Vec3 {
  // Translate relative to camera
  const dx = worldPos.x - camX;
  const dz = worldPos.z - camZ;

  // Rotate by negative camera angle
  const cos = Math.cos(-camAngle);
  const sin = Math.sin(-camAngle);

  return {
    x: dx * cos - dz * sin,
    y: worldPos.y,
    z: dx * sin + dz * cos,
  };
}

/** Distance between two points on the ground plane (XZ) */
export function distXZ(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Angle from (ax,az) to (bx,bz) */
export function angleToXZ(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bx - ax, bz - az);
}

/** Normalize an angle to [-PI, PI] */
export function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Clamp a value */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
