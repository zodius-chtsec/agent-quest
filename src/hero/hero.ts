/**
 * Hero entity: per-session animation/movement wrapper. The session store is
 * immutable; entities encapsulate the mutable per-frame state (position,
 * animation clock) that doesn't belong in the store.
 */

import { accentColor } from '../render/pixelart';
import { buildSpriteSet, HERO_SIZE, type SpriteSet } from '../render/sprites';
import type { SessionInfo } from '../types';

const WALK_SPEED = 90; // px/s
const OFFSCREEN_PAD = 80;

export class Hero {
  readonly id: string;
  readonly sprites: SpriteSet;
  session: SessionInfo;
  x: number;
  targetX: number;
  facing: 1 | -1 = 1;
  animClock = 0;
  /** One-shot attack swing: remaining ms and total duration. */
  private attackMs = 0;
  private attackDuration = 0;
  /** True once a LEAVING hero has fully walked off screen. */
  gone = false;

  constructor(session: SessionInfo, targetX: number) {
    this.id = session.id;
    this.session = session;
    this.sprites = buildSpriteSet(accentColor(session.id));
    this.x = -OFFSCREEN_PAD;
    this.targetX = targetX;
  }

  get walking(): boolean {
    return Math.abs(this.x - this.targetX) > 2;
  }

  /** Start a single attack swing of the given duration (restarts if mid-swing). */
  triggerAttack(durationMs: number): void {
    this.attackMs = durationMs;
    this.attackDuration = durationMs;
  }

  get attacking(): boolean {
    return this.attackMs > 0;
  }

  /** Elapsed time within the current swing, for one-shot frame selection. */
  get attackClock(): number {
    return this.attackDuration - this.attackMs;
  }

  update(dt: number, stripWidth: number): void {
    this.animClock += dt;
    this.attackMs = Math.max(0, this.attackMs - dt);

    if (this.session.state === 'LEAVING') {
      this.targetX = stripWidth + OFFSCREEN_PAD;
    }

    if (this.walking) {
      const dir = this.targetX > this.x ? 1 : -1;
      this.facing = dir;
      this.x += dir * WALK_SPEED * (dt / 1000);
      if ((dir === 1 && this.x > this.targetX) || (dir === -1 && this.x < this.targetX)) {
        this.x = this.targetX;
      }
    }

    if (this.session.state === 'LEAVING' && this.x >= stripWidth + OFFSCREEN_PAD - 1) {
      this.gone = true;
    }
  }

  /** Current frame index for an animation of `len` frames. */
  frame(len: number, frameMs: number): number {
    return Math.floor(this.animClock / frameMs) % len;
  }

  get width(): number {
    return this.session.isCompanion ? HERO_SIZE * 0.7 : HERO_SIZE;
  }
}
