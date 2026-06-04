import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  COMPANION_TTL_MS,
  HURT_RECOVERY_MS,
  projectNameFromCwd,
  remove,
  SESSION_TTL_MS,
  tick,
  WATCHING_TTL_MS,
  type SessionMap,
} from './sessionStore';
import type { QuestEvent } from '../types';

const T0 = 1_000_000;

function ev(partial: Partial<QuestEvent> & Pick<QuestEvent, 'kind'>): QuestEvent {
  return { sessionId: 's1', cwd: '/code/my-proj', ...partial } as QuestEvent;
}

describe('sessionStore', () => {
  it('creates a session on first event', () => {
    const sessions = applyEvent(new Map(), ev({ kind: 'session-start' }), T0);
    const s = sessions.get('s1')!;
    expect(s.state).toBe('ARRIVING');
    expect(s.projectName).toBe('my-proj');
    expect(s.startedAt).toBe(T0);
  });

  it('does not mutate the input map', () => {
    const before: SessionMap = new Map();
    applyEvent(before, ev({ kind: 'session-start' }), T0);
    expect(before.size).toBe(0);
  });

  it('tracks tool and action on pre-tool', () => {
    let sessions = applyEvent(new Map(), ev({ kind: 'session-start' }), T0);
    sessions = applyEvent(sessions, ev({ kind: 'pre-tool', tool: 'Bash' }), T0 + 100);
    const s = sessions.get('s1')!;
    expect(s.state).toBe('WORKING');
    expect(s.action).toBe('cast');
    expect(s.currentTool).toBe('Bash');
  });

  it('keys companions separately and links to parent', () => {
    let sessions = applyEvent(new Map(), ev({ kind: 'session-start' }), T0);
    sessions = applyEvent(
      sessions,
      ev({ kind: 'pre-tool', tool: 'Grep', agentId: 'a1', agentType: 'Explore' }),
      T0 + 100,
    );
    expect(sessions.size).toBe(2);
    const companion = sessions.get('s1:a1')!;
    expect(companion.isCompanion).toBe(true);
    expect(companion.parentId).toBe('s1');
    expect(companion.agentType).toBe('Explore');
  });

  it('subagent-stop sends only the companion to LEAVING', () => {
    let sessions = applyEvent(new Map(), ev({ kind: 'session-start' }), T0);
    sessions = applyEvent(sessions, ev({ kind: 'subagent-start', agentId: 'a1' }), T0);
    sessions = applyEvent(sessions, ev({ kind: 'subagent-stop', agentId: 'a1' }), T0 + 100);
    expect(sessions.get('s1:a1')!.state).toBe('LEAVING');
    expect(sessions.get('s1')!.state).not.toBe('LEAVING');
  });

  it('WATCHING: stop with bg tasks keeps watch with long TTL', () => {
    let sessions = applyEvent(new Map(), ev({ kind: 'pre-tool', tool: 'Bash' }), T0);
    sessions = applyEvent(sessions, ev({ kind: 'stop', fullyIdle: false, bgTasks: 3 }), T0 + 10);
    const s = sessions.get('s1')!;
    expect(s.state).toBe('WATCHING');
    expect(s.bgTasks).toBe(3);
    // Outlives the normal session TTL...
    sessions = tick(sessions, T0 + 10 + SESSION_TTL_MS + 1);
    expect(sessions.get('s1')!.state).toBe('WATCHING');
    // ...but not the watching TTL.
    sessions = tick(sessions, T0 + 10 + WATCHING_TTL_MS + 1);
    expect(sessions.get('s1')!.state).toBe('LEAVING');
  });

  it('GC: silent sessions transition to LEAVING after TTL', () => {
    let sessions = applyEvent(new Map(), ev({ kind: 'pre-tool', tool: 'Edit' }), T0);
    sessions = tick(sessions, T0 + SESSION_TTL_MS - 1);
    expect(sessions.get('s1')!.state).toBe('WORKING');
    sessions = tick(sessions, T0 + SESSION_TTL_MS + 1);
    expect(sessions.get('s1')!.state).toBe('LEAVING');
  });

  it('GC: companions evict faster than main sessions', () => {
    let sessions = applyEvent(
      new Map(),
      ev({ kind: 'pre-tool', tool: 'Grep', agentId: 'a1' }),
      T0,
    );
    sessions = tick(sessions, T0 + COMPANION_TTL_MS + 1);
    expect(sessions.get('s1:a1')!.state).toBe('LEAVING');
  });

  it('HURT recovers to WORKING after the recovery window', () => {
    let sessions = applyEvent(new Map(), ev({ kind: 'tool-fail', tool: 'Bash' }), T0);
    expect(sessions.get('s1')!.state).toBe('HURT');
    sessions = tick(sessions, T0 + HURT_RECOVERY_MS + 1);
    expect(sessions.get('s1')!.state).toBe('WORKING');
  });

  it('tick returns the same reference when nothing changes', () => {
    const sessions = applyEvent(new Map(), ev({ kind: 'session-start' }), T0);
    expect(tick(sessions, T0 + 1)).toBe(sessions);
  });

  it('remove deletes by id', () => {
    const sessions = applyEvent(new Map(), ev({ kind: 'session-start' }), T0);
    expect(remove(sessions, 's1').size).toBe(0);
    expect(remove(sessions, 'nope')).toBe(sessions);
  });

  it('projectNameFromCwd handles edge cases', () => {
    expect(projectNameFromCwd('/a/b/proj')).toBe('proj');
    expect(projectNameFromCwd('/a/b/proj/')).toBe('proj');
    expect(projectNameFromCwd('')).toBe('unknown');
  });
});
