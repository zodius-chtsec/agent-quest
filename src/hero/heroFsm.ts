import type { HeroState, QuestEvent } from '../types';

/**
 * Pure hero state transition. Time-driven transitions (HURT recovery,
 * LEAVING walk-off, GC eviction) are handled by the entity layer, not here.
 *
 * `fullyIdle` only matters for 'stop': background tasks still running →
 * the hero keeps watch instead of going to sleep.
 */
export function nextState(
  state: HeroState,
  event: QuestEvent['kind'],
  fullyIdle = true,
): HeroState {
  switch (event) {
    case 'session-start':
      return state === 'LEAVING' ? 'ARRIVING' : state;
    case 'prompt':
    case 'pre-tool':
    case 'post-tool':
      // Any sign of work clears ATTENTION/HURT and gets the hero working.
      return 'WORKING';
    case 'tool-fail':
      return 'HURT';
    case 'permission':
      return 'ATTENTION';
    case 'stop':
      return fullyIdle ? 'IDLE' : 'WATCHING';
    case 'session-end':
      return 'LEAVING';
    case 'notification':
    case 'subagent-start':
    case 'subagent-stop':
      // Informational for the parent hero; no state change.
      return state;
  }
}

/** Initial state for a newly discovered session. */
export function initialState(): HeroState {
  return 'ARRIVING';
}
