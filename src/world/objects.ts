/**
 * Wireframe 3D object definitions for Battlezone.
 * Each model is defined as vertices (Vec3[]) and edges (index pairs).
 * All models are centered at origin; positioned via world coordinates.
 */

import { Vec3, Edge } from '../core/math.js';

export interface WireframeModel {
  vertices: Vec3[];
  edges: Edge[];
}

/** Player/enemy tank — boxy body with turret */
export function tankModel(): WireframeModel {
  const w = 12, h = 8, d = 18; // half-widths
  const tw = 5, th = 4, td = 12; // turret half-widths
  const bh = 3; // barrel height, bd = barrel length
  const bd = 22;

  const vertices: Vec3[] = [
    // Body (0-7): box
    { x: -w, y: 0, z: -d }, { x: w, y: 0, z: -d },
    { x: w, y: 0, z: d },   { x: -w, y: 0, z: d },
    { x: -w, y: h, z: -d }, { x: w, y: h, z: -d },
    { x: w, y: h, z: d },   { x: -w, y: h, z: d },
    // Turret (8-11): smaller box on top
    { x: -tw, y: h, z: -tw },     { x: tw, y: h, z: -tw },
    { x: tw, y: h, z: tw },       { x: -tw, y: h, z: tw },
    { x: -tw, y: h + th, z: -tw },{ x: tw, y: h + th, z: -tw },
    { x: tw, y: h + th, z: tw },  { x: -tw, y: h + th, z: tw },
    // Barrel (16-17)
    { x: 0, y: h + bh, z: td },
    { x: 0, y: h + bh, z: bd },
  ];

  const edges: Edge[] = [
    // Body bottom
    { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
    // Body top
    { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 }, { a: 7, b: 4 },
    // Body verticals
    { a: 0, b: 4 }, { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 3, b: 7 },
    // Turret top
    { a: 12, b: 13 }, { a: 13, b: 14 }, { a: 14, b: 15 }, { a: 15, b: 12 },
    // Turret verticals
    { a: 8, b: 12 }, { a: 9, b: 13 }, { a: 10, b: 14 }, { a: 11, b: 15 },
    // Barrel
    { a: 16, b: 17 },
  ];

  return { vertices, edges };
}

/** Cube obstacle */
export function cubeModel(size: number): WireframeModel {
  const s = size;
  const vertices: Vec3[] = [
    { x: -s, y: 0, z: -s }, { x: s, y: 0, z: -s },
    { x: s, y: 0, z: s },   { x: -s, y: 0, z: s },
    { x: -s, y: s * 2, z: -s }, { x: s, y: s * 2, z: -s },
    { x: s, y: s * 2, z: s },   { x: -s, y: s * 2, z: s },
  ];
  const edges: Edge[] = [
    { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
    { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 }, { a: 7, b: 4 },
    { a: 0, b: 4 }, { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 3, b: 7 },
  ];
  return { vertices, edges };
}

/** Pyramid obstacle */
export function pyramidModel(size: number): WireframeModel {
  const s = size;
  const h = size * 2.5;
  const vertices: Vec3[] = [
    { x: -s, y: 0, z: -s }, { x: s, y: 0, z: -s },
    { x: s, y: 0, z: s },   { x: -s, y: 0, z: s },
    { x: 0, y: h, z: 0 },   // apex
  ];
  const edges: Edge[] = [
    { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
    { a: 0, b: 4 }, { a: 1, b: 4 }, { a: 2, b: 4 }, { a: 3, b: 4 },
  ];
  return { vertices, edges };
}

/** Missile — elongated diamond shape */
export function missileModel(): WireframeModel {
  const w = 3, h = 3, d = 10;
  const vertices: Vec3[] = [
    { x: 0, y: h, z: d },    // nose
    { x: w, y: h, z: 0 },    // right
    { x: 0, y: h, z: -d },   // tail
    { x: -w, y: h, z: 0 },   // left
    { x: 0, y: h * 2, z: 0 },// top
    { x: 0, y: 0, z: 0 },    // bottom
  ];
  const edges: Edge[] = [
    { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
    { a: 0, b: 4 }, { a: 2, b: 4 }, { a: 0, b: 5 }, { a: 2, b: 5 },
  ];
  return { vertices, edges };
}

/** Flying saucer — disc shape */
export function saucerModel(): WireframeModel {
  const r = 16, h = 5, domeH = 10;
  const segs = 8;
  const vertices: Vec3[] = [];
  const edges: Edge[] = [];

  // Bottom ring
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    vertices.push({ x: Math.cos(a) * r, y: h, z: Math.sin(a) * r });
  }
  // Top ring (smaller)
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    vertices.push({ x: Math.cos(a) * r * 0.5, y: h + domeH, z: Math.sin(a) * r * 0.5 });
  }

  // Bottom ring edges
  for (let i = 0; i < segs; i++) {
    edges.push({ a: i, b: (i + 1) % segs });
  }
  // Top ring edges
  for (let i = 0; i < segs; i++) {
    edges.push({ a: segs + i, b: segs + (i + 1) % segs });
  }
  // Verticals connecting rings
  for (let i = 0; i < segs; i += 2) {
    edges.push({ a: i, b: segs + i });
  }

  return { vertices, edges };
}
