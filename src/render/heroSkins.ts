/**
 * Hero skins from real art packs. At startup we try to load every faction
 * atlas listed in the manifest; heroes are assigned a loaded skin by their
 * session hash (stable per session). No atlases loaded → procedural art.
 */

import { hashString } from '../util/hash';
import { loadAtlas, type Atlas } from './spritesheet';

/** Committed atlas descriptors; PNGs themselves are gitignored. */
const SKIN_ATLASES = [
  '/atlas/warrior-blue.json',
  '/atlas/warrior-purple.json',
  '/atlas/warrior-red.json',
  '/atlas/warrior-yellow.json',
  '/atlas/warrior-black.json',
];

let skins: Atlas[] = [];

/** Best-effort load; missing packs simply yield fewer (or zero) skins. */
export async function loadHeroSkins(): Promise<number> {
  const results = await Promise.all(SKIN_ATLASES.map((url) => loadAtlas(url)));
  skins = results.filter((a): a is Atlas => a !== null);
  return skins.length;
}

export function hasSkins(): boolean {
  return skins.length > 0;
}

/** Stable skin pick per hero id; null when no packs are installed. */
export function skinFor(heroId: string): Atlas | null {
  if (skins.length === 0) return null;
  return skins[hashString(heroId) % skins.length];
}
