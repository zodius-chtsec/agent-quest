/**
 * Immutable monster store: one monster per main session, representing the
 * current task (one user-prompt → Stop cycle). Tool calls land hits; damage
 * accumulates through evolution tiers so long tasks visibly escalate:
 * slime → goblin → ogre → dragon.
 */

import type { MonsterInfo, MonsterTier, QuestEvent } from '../types';

/** Cumulative hits needed to REACH each tier (index = tier). */
export const TIER_THRESHOLDS = [0, 8, 20, 40] as const;
export const TIER_NAMES = ['Slime', 'Goblin', 'Ogre', 'Dragon'] as const;
/** Safety GC: corpses linger at most this long if the renderer stalls. */
export const CORPSE_TTL_MS = 10_000;

export function tierForHits(hits: number): MonsterTier {
  let tier: MonsterTier = 0;
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (hits >= TIER_THRESHOLDS[i]) {
      tier = i as MonsterTier;
      break;
    }
  }
  return tier;
}

export function tierProgressForHits(hits: number): number {
  const tier = tierForHits(hits);
  if (tier === TIER_THRESHOLDS.length - 1) return 1;
  const base = TIER_THRESHOLDS[tier];
  const next = TIER_THRESHOLDS[tier + 1];
  return (hits - base) / (next - base);
}

function spawn(sessionId: string, now: number): MonsterInfo {
  return {
    sessionId,
    state: 'FIGHTING',
    tier: 0,
    hits: 0,
    tierProgress: 0,
    spawnedAt: now,
    lastHitAt: 0,
    lastCounterAt: 0,
  };
}

function withHit(monster: MonsterInfo, now: number): MonsterInfo {
  const hits = monster.hits + 1;
  return {
    ...monster,
    hits,
    tier: tierForHits(hits),
    tierProgress: tierProgressForHits(hits),
    lastHitAt: now,
  };
}

export type MonsterMap = ReadonlyMap<string, MonsterInfo>;

/**
 * Apply one event. Companion (subagent) tool calls credit the parent
 * session's monster — the party fights the same task together.
 */
export function applyMonsterEvent(
  monsters: MonsterMap,
  event: QuestEvent,
  now: number,
): MonsterMap {
  const key = event.sessionId;
  const existing = monsters.get(key);

  switch (event.kind) {
    case 'prompt': {
      // Subagents never start a new task of their own.
      if (event.agentId) return monsters;
      // A new prompt while the old corpse is fading replaces it; a prompt
      // mid-fight (user steering) keeps the same monster.
      if (existing && existing.state === 'FIGHTING') return monsters;
      const next = new Map(monsters);
      next.set(key, spawn(key, now));
      return next;
    }
    case 'pre-tool':
    case 'post-tool': {
      // Count damage once per tool call: on post-tool (the hit landing).
      // pre-tool only lazily spawns a monster for fights we joined late
      // (app started mid-task), so the hero never swings at thin air.
      const alive = existing && existing.state === 'FIGHTING' ? existing : spawn(key, now);
      const next = new Map(monsters);
      next.set(key, event.kind === 'post-tool' ? withHit(alive, now) : alive);
      return next;
    }
    case 'tool-fail': {
      if (!existing || existing.state !== 'FIGHTING') return monsters;
      const next = new Map(monsters);
      next.set(key, { ...existing, lastCounterAt: now });
      return next;
    }
    case 'stop': {
      // Subagent Stop events don't end the main fight.
      if (event.agentId) return monsters;
      if (!existing || existing.state !== 'FIGHTING') return monsters;
      const next = new Map(monsters);
      next.set(key, { ...existing, state: 'DYING', diedAt: now });
      return next;
    }
    case 'session-end': {
      if (!monsters.has(key)) return monsters;
      const next = new Map(monsters);
      next.delete(key);
      return next;
    }
    default:
      return monsters;
  }
}

/** Drop corpses the renderer never reclaimed (safety net). */
export function tickMonsters(monsters: MonsterMap, now: number): MonsterMap {
  let changed = false;
  const next = new Map(monsters);
  for (const [key, m] of next) {
    if (m.state === 'DYING' && m.diedAt !== undefined && now - m.diedAt > CORPSE_TTL_MS) {
      next.delete(key);
      changed = true;
    }
  }
  return changed ? next : monsters;
}

/** Remove a monster once its death animation has finished. */
export function removeMonster(monsters: MonsterMap, sessionId: string): MonsterMap {
  if (!monsters.has(sessionId)) return monsters;
  const next = new Map(monsters);
  next.delete(sessionId);
  return next;
}
