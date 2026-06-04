import { describe, expect, it } from 'vitest';
import { initialState, nextState } from './heroFsm';
import type { HeroState, QuestEvent } from '../types';

describe('heroFsm.nextState', () => {
  it('starts heroes in ARRIVING', () => {
    expect(initialState()).toBe('ARRIVING');
  });

  it.each<[HeroState, QuestEvent['kind'], HeroState]>([
    ['ARRIVING', 'pre-tool', 'WORKING'],
    ['ARRIVING', 'prompt', 'WORKING'],
    ['IDLE', 'pre-tool', 'WORKING'],
    ['IDLE', 'prompt', 'WORKING'],
    ['WORKING', 'post-tool', 'WORKING'],
    ['WORKING', 'tool-fail', 'HURT'],
    ['HURT', 'pre-tool', 'WORKING'],
    ['WORKING', 'permission', 'ATTENTION'],
    ['ATTENTION', 'pre-tool', 'WORKING'],
    ['WORKING', 'stop', 'IDLE'],
    ['ATTENTION', 'stop', 'IDLE'],
    ['WORKING', 'session-end', 'LEAVING'],
    ['IDLE', 'session-end', 'LEAVING'],
    ['LEAVING', 'session-start', 'ARRIVING'],
    ['WORKING', 'session-start', 'WORKING'],
  ])('%s + %s -> %s', (state, event, expected) => {
    expect(nextState(state, event)).toBe(expected);
  });

  it('ignores informational events', () => {
    for (const kind of ['notification', 'subagent-start', 'subagent-stop'] as const) {
      expect(nextState('WORKING', kind)).toBe('WORKING');
      expect(nextState('IDLE', kind)).toBe('IDLE');
      expect(nextState('ATTENTION', kind)).toBe('ATTENTION');
    }
  });
});
