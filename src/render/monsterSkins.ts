/**
 * Monster skins from the CC0 LuizMelo "Monsters Creatures Fantasy" pack
 * (committed to the repo). One atlas per evolution tier; the five elemental
 * families are produced by hue-rotating each animation strip once at load.
 * Loading is best-effort: failure → procedural pixel monsters.
 */

import { loadAtlas, type Atlas, type AtlasAnim } from './spritesheet';

const TIER_ATLASES = [
  '/atlas/monster-tier0.json',
  '/atlas/monster-tier1.json',
  '/atlas/monster-tier2.json',
  '/atlas/monster-tier3.json',
];

/** Hue shift (degrees) per family: Forest, Frost, Magma, Shadow, Toxic. */
const FAMILY_HUES = [0, 140, 210, 280, 60];

/** skins[species][tier]; null until loaded. */
let skins: Atlas[][] | null = null;

export async function loadMonsterSkins(): Promise<boolean> {
  const bases = await Promise.all(TIER_ATLASES.map((url) => loadAtlas(url)));
  if (bases.some((b) => b === null)) return false;
  const tiers = bases as Atlas[];
  skins = FAMILY_HUES.map((hue) => tiers.map((atlas) => tintAtlas(atlas, hue)));
  return true;
}

export function monsterSkin(species: number, tier: number): Atlas | null {
  if (!skins) return null;
  const family = skins[species % skins.length];
  return family[Math.min(tier, family.length - 1)] ?? null;
}

function tintAtlas(atlas: Atlas, degrees: number): Atlas {
  if (degrees === 0) return atlas;
  const anims: Record<string, AtlasAnim> = {};
  for (const [name, anim] of Object.entries(atlas.anims)) {
    anims[name] = { ...anim, image: hueRotate(anim.image, degrees) };
  }
  return { ...atlas, anims };
}

/**
 * Hue-rotate an image into a canvas using the SVG feColorMatrix
 * approximation — done once per (family, strip) at load, so the render
 * loop never touches pixels.
 */
function hueRotate(
  source: HTMLImageElement | HTMLCanvasElement,
  degrees: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  // SVG hueRotate matrix coefficients.
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    px[i] = clamp255(m[0] * r + m[1] * g + m[2] * b);
    px[i + 1] = clamp255(m[3] * r + m[4] * g + m[5] * b);
    px[i + 2] = clamp255(m[6] * r + m[7] * g + m[8] * b);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}
