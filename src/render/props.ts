/**
 * Small scene props from real art packs (currently: the CC0 campfire).
 * Best-effort loading; callers fall back to procedural art when absent.
 */

import { loadAtlas, type Atlas } from './spritesheet';

let campfire: Atlas | null = null;

export async function loadProps(): Promise<void> {
  campfire = await loadAtlas('/atlas/campfire.json');
}

export function campfireAtlas(): Atlas | null {
  return campfire;
}
