import { describe, expect, it } from 'vitest';
import {
  applyMonsterEvent,
  CORPSE_TTL_MS,
  removeMonster,
  tickMonsters,
  tierForHits,
  tierProgressForHits,
  TIER_THRESHOLDS,
  type MonsterMap,
} from './monsterStore';
import type { QuestEvent } from '../types';

const T0 = 1_000_000;

function ev(partial: Partial<QuestEvent> & Pick<QuestEvent, 'kind'>): QuestEvent {
  return { sessionId: 's1', cwd: '/code/p', ...partial } as QuestEvent;
}

function fight(hits: number, start: MonsterMap = new Map()): MonsterMap {
  let monsters = applyMonsterEvent(start, ev({ kind: 'prompt' }), T0);
  for (let i = 0; i < hits; i++) {
    monsters = applyMonsterEvent(monsters, ev({ kind: 'post-tool', tool: 'Edit' }), T0 + i);
  }
  return monsters;
}

describe('tier math', () => {
  it('maps hits to tiers at thresholds', () => {
    expect(tierForHits(0)).toBe(0);
    expect(tierForHits(TIER_THRESHOLDS[1] - 1)).toBe(0);
    expect(tierForHits(TIER_THRESHOLDS[1])).toBe(1);
    expect(tierForHits(TIER_THRESHOLDS[2])).toBe(2);
    expect(tierForHits(TIER_THRESHOLDS[3])).toBe(3);
    expect(tierForHits(999)).toBe(3);
  });

  it('progress fills within a tier and caps at max', () => {
    expect(tierProgressForHits(0)).toBe(0);
    expect(tierProgressForHits(4)).toBe(0.5);
    expect(tierProgressForHits(999)).toBe(1);
  });
});

describe('applyMonsterEvent', () => {
  it('spawns on prompt, one per main session', () => {
    const monsters = applyMonsterEvent(new Map(), ev({ kind: 'prompt' }), T0);
    expect(monsters.get('s1')).toMatchObject({ state: 'FIGHTING', tier: 0, hits: 0 });
  });

  it('does not respawn on prompt mid-fight (user steering)', () => {
    const before = fight(3);
    const after = applyMonsterEvent(before, ev({ kind: 'prompt' }), T0 + 100);
    expect(after.get('s1')!.hits).toBe(3);
  });

  it('replaces a dying corpse on a new prompt', () => {
    let monsters = fight(3);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'stop' }), T0 + 50);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'prompt' }), T0 + 100);
    expect(monsters.get('s1')).toMatchObject({ state: 'FIGHTING', hits: 0 });
  });

  it('ignores prompts from subagents', () => {
    const monsters = applyMonsterEvent(new Map(), ev({ kind: 'prompt', agentId: 'a1' }), T0);
    expect(monsters.size).toBe(0);
  });

  it('counts damage on post-tool only', () => {
    let monsters = applyMonsterEvent(new Map(), ev({ kind: 'prompt' }), T0);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'pre-tool', tool: 'Edit' }), T0 + 1);
    expect(monsters.get('s1')!.hits).toBe(0);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'post-tool', tool: 'Edit' }), T0 + 2);
    expect(monsters.get('s1')!.hits).toBe(1);
    expect(monsters.get('s1')!.lastHitAt).toBe(T0 + 2);
  });

  it('companion hits credit the parent monster', () => {
    let monsters = fight(1);
    monsters = applyMonsterEvent(
      monsters,
      ev({ kind: 'post-tool', tool: 'Grep', agentId: 'a1', agentType: 'Explore' }),
      T0 + 10,
    );
    expect(monsters.size).toBe(1);
    expect(monsters.get('s1')!.hits).toBe(2);
  });

  it('lazily spawns when joining a fight late', () => {
    const monsters = applyMonsterEvent(new Map(), ev({ kind: 'pre-tool', tool: 'Edit' }), T0);
    expect(monsters.get('s1')).toMatchObject({ state: 'FIGHTING' });
  });

  it('evolves through tiers as hits accumulate', () => {
    const monsters = fight(TIER_THRESHOLDS[2]);
    expect(monsters.get('s1')!.tier).toBe(2);
  });

  it('stop kills the monster; subagent stop does not', () => {
    let monsters = fight(5);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'stop', agentId: 'a1' }), T0 + 50);
    expect(monsters.get('s1')!.state).toBe('FIGHTING');
    monsters = applyMonsterEvent(monsters, ev({ kind: 'stop' }), T0 + 60);
    expect(monsters.get('s1')).toMatchObject({ state: 'DYING', diedAt: T0 + 60 });
  });

  it('tool-fail records a counterattack', () => {
    let monsters = fight(2);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'tool-fail', tool: 'Bash' }), T0 + 30);
    expect(monsters.get('s1')!.lastCounterAt).toBe(T0 + 30);
  });

  it('session-end removes the monster', () => {
    let monsters = fight(2);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'session-end' }), T0 + 99);
    expect(monsters.size).toBe(0);
  });

  it('never mutates the input map', () => {
    const before: MonsterMap = new Map();
    applyMonsterEvent(before, ev({ kind: 'prompt' }), T0);
    expect(before.size).toBe(0);
  });
});

describe('tickMonsters / removeMonster', () => {
  it('GCs stale corpses after TTL', () => {
    let monsters = fight(1);
    monsters = applyMonsterEvent(monsters, ev({ kind: 'stop' }), T0 + 10);
    expect(tickMonsters(monsters, T0 + 10 + CORPSE_TTL_MS - 1).size).toBe(1);
    expect(tickMonsters(monsters, T0 + 10 + CORPSE_TTL_MS + 1).size).toBe(0);
  });

  it('returns same reference when nothing changes', () => {
    const monsters = fight(1);
    expect(tickMonsters(monsters, T0 + 1)).toBe(monsters);
    expect(removeMonster(monsters, 'nope')).toBe(monsters);
  });

  it('removeMonster deletes by session id', () => {
    const monsters = fight(1);
    expect(removeMonster(monsters, 's1').size).toBe(0);
  });
});
