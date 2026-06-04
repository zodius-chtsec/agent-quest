/**
 * Monster entity: per-fight animation state (bounce, hit flash, lunge,
 * death squash). Mirrors the Hero/SessionInfo split: the store is
 * immutable, the entity owns mutable per-frame state.
 *
 * All transient animations run on dt-driven local clocks (set when the
 * renderer detects a store change), so store wall-clock timestamps never
 * mix with the rAF clock.
 */

import type { MonsterInfo } from '../types';

export const MONSTER_OFFSET = 96; // px right of the hero's slot
const DEATH_MS = 600; // 4 death frames @ ~7fps, then gone
const LUNGE_MS = 660; // full 8-frame attack swing @ 12fps
const FLASH_MS = 120;
const HIT_ANIM_MS = 400; // 4 take-hit frames @ 10fps

export class MonsterEntity {
  readonly sessionId: string;
  info: MonsterInfo;
  /** Anchor x (hero slot + offset); feet planted on the ground line. */
  x = 0;
  /** Tier as last rendered, to detect evolutions. */
  renderedTier: number;
  /** Hits as last rendered, to emit damage numbers. */
  renderedHits: number;
  animClock = 0;
  private deathClock = 0;
  private flashMs = 0;
  private lungeMs = 0;
  private hitAnimMs = 0;
  gone = false;

  constructor(info: MonsterInfo) {
    this.sessionId = info.sessionId;
    this.info = info;
    this.renderedTier = info.tier;
    this.renderedHits = info.hits;
  }

  /** Trigger the hit flash + take-hit animation (new damage landed). */
  flash(): void {
    this.flashMs = FLASH_MS;
    this.hitAnimMs = HIT_ANIM_MS;
  }

  /** Trigger the counterattack lunge toward the hero. */
  lunge(): void {
    this.lungeMs = LUNGE_MS;
  }

  update(dt: number): void {
    this.animClock += dt;
    this.flashMs = Math.max(0, this.flashMs - dt);
    this.lungeMs = Math.max(0, this.lungeMs - dt);
    this.hitAnimMs = Math.max(0, this.hitAnimMs - dt);
    if (this.info.state === 'DYING') {
      this.deathClock += dt;
      if (this.deathClock >= DEATH_MS) this.gone = true;
    }
  }

  /**
   * Which atlas animation to show right now, with a clock that starts at 0
   * when the one-shot was triggered (so it plays from its first frame).
   */
  atlasAnim(): { name: string; clock: number; once: boolean } {
    if (this.info.state === 'DYING') {
      return { name: 'death', clock: this.deathClock, once: true };
    }
    if (this.lungeMs > 0) {
      return { name: 'attack', clock: LUNGE_MS - this.lungeMs, once: true };
    }
    if (this.hitAnimMs > 0) {
      return { name: 'hit', clock: HIT_ANIM_MS - this.hitAnimMs, once: true };
    }
    return { name: 'idle', clock: this.animClock, once: false };
  }

  /** 0..1 death progress (squash + fade). */
  get deathT(): number {
    return Math.min(1, this.deathClock / DEATH_MS);
  }

  get flashing(): boolean {
    return this.flashMs > 0;
  }

  /** Lunge offset toward the hero during a counterattack. */
  get lungeOffset(): number {
    if (this.lungeMs <= 0) return 0;
    const t = 1 - this.lungeMs / LUNGE_MS;
    return -14 * Math.sin(t * Math.PI);
  }

  frame(len: number, frameMs: number): number {
    return Math.floor(this.animClock / frameMs) % len;
  }
}
