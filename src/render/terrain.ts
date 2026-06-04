/**
 * Ground layer: a seeded, programmatic pixel grass strip pre-rendered to an
 * offscreen canvas (redrawn only on resize).
 */

import { hashString } from './pixelart';

export const GROUND_HEIGHT = 48;

const GRASS_TOP = '#5da349';
const GRASS_BODY = '#4c8a3c';
const GRASS_DARK = '#3f7330';
const DIRT = '#7a5a35';
const DIRT_DARK = '#64482a';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pre-render the ground strip for the given width. */
export function renderTerrain(width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = GROUND_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(hashString('agent-quest-terrain'));
  const px = 4;

  // Grass blade fringe on top row.
  ctx.fillStyle = GRASS_TOP;
  for (let x = 0; x < width; x += px) {
    const bladeUp = rand() < 0.3 ? px : 0;
    ctx.fillRect(x, px - bladeUp, px, px + bladeUp);
  }
  // Grass body with darker speckles.
  ctx.fillStyle = GRASS_BODY;
  ctx.fillRect(0, px * 2, width, px * 3);
  for (let x = 0; x < width; x += px) {
    if (rand() < 0.18) {
      ctx.fillStyle = GRASS_DARK;
      ctx.fillRect(x, px * (2 + Math.floor(rand() * 3)), px, px);
      ctx.fillStyle = GRASS_BODY;
    }
  }
  // Dirt below.
  ctx.fillStyle = DIRT;
  ctx.fillRect(0, px * 5, width, GROUND_HEIGHT - px * 5);
  for (let x = 0; x < width; x += px) {
    if (rand() < 0.12) {
      ctx.fillStyle = DIRT_DARK;
      ctx.fillRect(x, px * (5 + Math.floor(rand() * 6)), px, px);
      ctx.fillStyle = DIRT;
    }
  }
  return canvas;
}
