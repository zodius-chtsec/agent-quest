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

  it('stop with background tasks → WATCHING; resumes to WORKING', () => {
    expect(nextState('WORKING', 'stop', false)).toBe('WATCHING');
    expect(nextState('WORKING', 'stop', true)).toBe('IDLE');
    expect(nextState('WORKING', 'stop')).toBe('IDLE'); // default fullyIdle
    expect(nextState('WATCHING', 'pre-tool')).toBe('WORKING');
    expect(nextState('WATCHING', 'stop', true)).toBe('IDLE');
    expect(nextState('WATCHING', 'session-end')).toBe('LEAVING');
  });

  it('ignores informational events', () => {
    for (const kind of ['notification', 'subagent-start', 'subagent-stop'] as const) {
      expect(nextState('WORKING', kind)).toBe('WORKING');
      expect(nextState('IDLE', kind)).toBe('IDLE');
      expect(nextState('ATTENTION', kind)).toBe('ATTENTION');
    }
  });
});
