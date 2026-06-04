import { describe, expect, it } from 'vitest';
import { assignSlots, overflowCount } from './layout';
import type { SessionInfo } from '../types';

function session(id: string, startedAt: number, companion = false, parentId?: string): SessionInfo {
  return {
    id,
    sessionId: id,
    cwd: `/code/${id}`,
    projectName: id,
    isCompanion: companion,
    parentId,
    agentType: undefined,
    state: 'WORKING',
    action: 'generic',
    currentTool: undefined,
    bgTasks: 0,
    lastSeen: startedAt,
    startedAt,
  };
}

describe('assignSlots', () => {
  it('orders main heroes by arrival time', () => {
    const slots = assignSlots([session('b', 200), session('a', 100)], 2000);
    expect(slots.get('a')!.targetX).toBeLessThan(slots.get('b')!.targetX);
  });

  it('places companions next to their parent', () => {
    const slots = assignSlots(
      [session('a', 100), session('a:sub', 150, true, 'a')],
      2000,
    );
    const parent = slots.get('a')!;
    const comp = slots.get('a:sub')!;
    expect(comp.targetX).toBeGreaterThan(parent.targetX);
    expect(comp.targetX - parent.targetX).toBeLessThan(100);
    expect(comp.visible).toBe(true);
  });

  it('hides overflow heroes on a narrow strip', () => {
    const many = Array.from({ length: 10 }, (_, i) => session(`s${i}`, i));
    const slots = assignSlots(many, 500); // fits ~2 slots
    expect(overflowCount(slots)).toBeGreaterThan(0);
    const visible = [...slots.values()].filter((s) => s.visible);
    expect(visible.length).toBeLessThan(10);
  });

  it('companion of hidden parent is hidden too', () => {
    const many = Array.from({ length: 10 }, (_, i) => session(`s${i}`, i));
    many.push(session('s9:sub', 99, true, 's9'));
    const slots = assignSlots(many, 500);
    expect(slots.get('s9:sub')!.visible).toBe(false);
  });
});
