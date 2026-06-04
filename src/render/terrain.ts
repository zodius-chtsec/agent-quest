/**
 * Ground layer. Preferred: Magic Cliffs tileset (ansimuz, redistributable)
 * — a tiled grass slab with rock fill, plus baked decorations (trees,
 * tufts) and an animated floating island. Fallback: the original seeded
 * procedural pixel strip.
 */

import { hashString } from '../util/hash';

export const GROUND_HEIGHT = 48;

// --- Magic Cliffs art ----------------------------------------------------

/**
 * Crops within tileset.png (verified against pixel data). Ground pieces
 * come from the INTERIOR of the big cliff block (x48-111) — fully solid
 * and seamlessly tileable, unlike the gappy floating-platform strips.
 */
const CROPS = {
  // Two interior grass-top TILES (16px, designed to tile seamlessly),
  // alternated for variation instead of one wide slice with hard seams.
  grass: [
    { x: 64, y: 188, w: 16, h: 20 },
    { x: 80, y: 188, w: 16, h: 20 },
  ],
  // Soil transition row directly under the grass — moss-free columns only
  // (the x80-95 tile carries green pixels that read as seam artifacts).
  soil: [
    { x: 48, y: 208, w: 16, h: 16 },
    { x: 64, y: 208, w: 16, h: 16 },
  ],
  // Moss-free continuous dark-rock band; mirror-tiled so seam edges always
  // meet their own reflection (identical colors → invisible seams).
  rock: { x: 56, y: 240, w: 28, h: 48 },
  tree: { x: 192, y: 46, w: 123, h: 114 }, // canopy ends x=314; base y=159
  island: { x: 41, y: 0, w: 98, h: 115 }, // skip the grid-mark column at x<16
} as const;

interface TerrainArt {
  readonly grass: HTMLCanvasElement[];
  readonly soil: HTMLCanvasElement[];
  readonly rock: HTMLCanvasElement;
  readonly tree: HTMLCanvasElement;
  readonly island: HTMLCanvasElement;
}

let art: TerrainArt | null = null;

function crop(img: HTMLImageElement, c: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = c.w;
  canvas.height = c.h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
  return canvas;
}

/** Best-effort tileset load; false → procedural fallback stays active. */
export async function loadTerrainArt(): Promise<boolean> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('tileset missing'));
      el.src = '/environment/magic-cliffs/tileset.png';
    });
    art = {
      grass: CROPS.grass.map((c) => crop(img, c)),
      soil: CROPS.soil.map((c) => crop(img, c)),
      rock: crop(img, CROPS.rock),
      tree: crop(img, CROPS.tree),
      island: crop(img, CROPS.island),
    };
    return true;
  } catch {
    return false;
  }
}

/** Pre-render the ground strip for the given width. */
export function renderTerrain(width: number): HTMLCanvasElement {
  return art ? renderTiledGround(art, width) : renderProcedural(width);
}

function renderTiledGround(a: TerrainArt, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = GROUND_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const rand = mulberry32(hashString('agent-quest-ground'));
  const pick = (tiles: HTMLCanvasElement[]) => tiles[Math.floor(rand() * tiles.length)];
  const grassH = a.grass[0].height;
  const soilH = a.soil[0].height;
  // Vertical structure mirrors the source block: grass → soil → dark rock.
  for (let x = 0; x < width; x += 16) {
    ctx.drawImage(pick(a.grass), x, 0);
    ctx.drawImage(pick(a.soil), x, grassH);
  }
  // Mirror-tile the rock band: every other repeat is flipped so adjoining
  // edges are reflections of each other — no color discontinuity.
  const rockTop = grassH + soilH;
  let flipped = false;
  for (let x = 0; x < width; x += a.rock.width) {
    if (flipped) {
      ctx.save();
      ctx.translate(x + a.rock.width, rockTop);
      ctx.scale(-1, 1);
      ctx.drawImage(a.rock, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(a.rock, x, rockTop);
    }
    flipped = !flipped;
  }
  // Speckle overlay: breaks up the periodic repeat so seams stop aligning.
  const speckles = ['#0e1a1e', '#1a2e33', '#2a3a3e', '#243439'];
  for (let x = 0; x < width; x += 4) {
    if (rand() < 0.1) {
      const y = rockTop + 2 + rand() * (GROUND_HEIGHT - rockTop - 6);
      const size = 2 + Math.floor(rand() * 3);
      ctx.fillStyle = speckles[Math.floor(rand() * speckles.length)];
      ctx.fillRect(x, y, size, size);
    }
  }
  return canvas;
}

/**
 * Bake static decorations (trees, grass tufts) into a full-strip overlay,
 * drawn behind heroes. Positions are seeded → stable across resizes.
 */
export function renderDecorations(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = height;
  if (!art) return canvas; // procedural mode: no decorations
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const groundTop = height - GROUND_HEIGHT;
  const rand = mulberry32(hashString('agent-quest-deco'));

  // Trees every ~420-700px; the crop's bottom row IS the trunk base, so
  // overlap a few px into the ground for planted roots.
  const treeScale = 0.62;
  const treeW = art.tree.width * treeScale;
  const treeH = art.tree.height * treeScale;
  for (let x = 80 + rand() * 200; x < width - treeW; x += 420 + rand() * 280) {
    ctx.globalAlpha = 0.9;
    ctx.drawImage(art.tree, x, groundTop + 10 - treeH, treeW, treeH);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Animated floating island, drawn per-frame (cheap single blit). */
export function drawIsland(
  ctx: CanvasRenderingContext2D,
  width: number,
  clockMs: number,
): void {
  if (!art) return;
  const scale = 0.5;
  const w = art.island.width * scale;
  const h = art.island.height * scale;
  const x = width * 0.82;
  const bob = Math.sin(clockMs / 1600) * 4;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(art.island, x, 10 + bob, w, h);
  ctx.globalAlpha = 1;
}

// --- Procedural fallback (original implementation) -----------------------

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

function renderProcedural(width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = GROUND_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(hashString('agent-quest-terrain'));
  const px = 4;

  ctx.fillStyle = GRASS_TOP;
  for (let x = 0; x < width; x += px) {
    const bladeUp = rand() < 0.3 ? px : 0;
    ctx.fillRect(x, px - bladeUp, px, px + bladeUp);
  }
  ctx.fillStyle = GRASS_BODY;
  ctx.fillRect(0, px * 2, width, px * 3);
  for (let x = 0; x < width; x += px) {
    if (rand() < 0.18) {
      ctx.fillStyle = GRASS_DARK;
      ctx.fillRect(x, px * (2 + Math.floor(rand() * 3)), px, px);
      ctx.fillStyle = GRASS_BODY;
    }
  }
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
