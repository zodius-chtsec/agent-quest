/**
 * Demo driver (?demo=1): feeds scripted fake events through the same store
 * pipeline as real hooks, for development without Claude Code.
 *
 * Spawns many sessions at once with randomized, fast cycles so combat,
 * evolution, kills and species variety are all visible within seconds.
 */

import type { QuestEvent } from './types';

type Emit = (event: QuestEvent) => void;

const TOOLS = ['Read', 'Edit', 'Bash', 'Grep', 'Write', 'WebSearch'];
const SESSION_COUNT = 6;

function ev(partial: Partial<QuestEvent> & Pick<QuestEvent, 'kind' | 'sessionId'>): QuestEvent {
  return { cwd: `/Users/demo/code/${partial.sessionId}`, ...partial } as QuestEvent;
}

/** pre-tool, then the landed hit shortly after. */
function swing(emit: Emit, sessionId: string, tool: string, agentId?: string, agentType?: string): void {
  emit(ev({ kind: 'pre-tool', sessionId, tool, agentId, agentType }));
  setTimeout(() => emit(ev({ kind: 'post-tool', sessionId, tool, agentId, agentType })), 400);
}

interface Profile {
  /** ms between swings */
  readonly pace: number;
  /** hits per quest before the kill (controls how far it evolves) */
  readonly questLength: number;
  /** rest between kill and next quest */
  readonly restMs: number;
  readonly failsSometimes: boolean;
  readonly asksPermission: boolean;
  readonly summonsCompanion: boolean;
  /** Mid-quest, stop with running background tasks (WATCHING state). */
  readonly watchesBackground?: boolean;
}

function runSession(emit: Emit, id: string, profile: Profile): void {
  emit(ev({ kind: 'session-start', sessionId: id }));
  emit(ev({ kind: 'prompt', sessionId: id }));

  let hitsThisQuest = 0;
  let resting = false;
  let watched = false;

  setInterval(() => {
    if (resting) return;

    hitsThisQuest++;
    if (hitsThisQuest > profile.questLength) {
      // Once per quest: pause with background tasks running — hero keeps
      // watch by the fire, monster lurks, then the fight resumes.
      if (profile.watchesBackground && !watched) {
        watched = true;
        emit(ev({ kind: 'stop', sessionId: id, fullyIdle: false, bgTasks: 2 }));
        resting = true;
        hitsThisQuest = profile.questLength - 2;
        setTimeout(() => {
          resting = false;
        }, profile.restMs * 3);
        return;
      }
      watched = false;
      // Quest complete: kill the monster, rest, then take a new quest.
      if (profile.summonsCompanion) {
        emit(ev({ kind: 'subagent-stop', sessionId: id, agentId: `${id}-sub` }));
      }
      emit(ev({ kind: 'stop', sessionId: id, fullyIdle: true }));
      resting = true;
      hitsThisQuest = 0;
      setTimeout(() => {
        emit(ev({ kind: 'prompt', sessionId: id }));
        resting = false;
      }, profile.restMs);
      return;
    }

    if (profile.failsSometimes && hitsThisQuest % 5 === 3) {
      emit(ev({ kind: 'tool-fail', sessionId: id, tool: 'Bash' }));
      return;
    }
    if (profile.asksPermission && hitsThisQuest % 7 === 5) {
      emit(ev({ kind: 'permission', sessionId: id }));
      return;
    }
    if (profile.summonsCompanion && hitsThisQuest === 2) {
      swing(emit, id, 'Task');
      emit(ev({ kind: 'subagent-start', sessionId: id, agentId: `${id}-sub`, agentType: 'Explore' }));
      return;
    }
    const viaCompanion = profile.summonsCompanion && hitsThisQuest > 2 && hitsThisQuest % 2 === 0;
    swing(
      emit,
      id,
      TOOLS[Math.floor(Math.random() * TOOLS.length)],
      viaCompanion ? `${id}-sub` : undefined,
      viaCompanion ? 'Explore' : undefined,
    );
  }, profile.pace);
}

export function startDemo(emit: Emit): void {
  const profiles: Array<[string, Profile]> = [
    // Fast killer: new monster (= new species roll) every ~8s.
    ['speedrun', { pace: 1200, questLength: 5, restMs: 2000, failsSometimes: false, asksPermission: false, summonsCompanion: false }],
    // Grinder: evolves all the way to dragon before the kill.
    ['epic-quest', { pace: 900, questLength: 45, restMs: 3000, failsSometimes: false, asksPermission: false, summonsCompanion: false }],
    // Clumsy: fails regularly (counterattacks + hurt animation).
    ['flaky-ci', { pace: 1600, questLength: 12, restMs: 2500, failsSometimes: true, asksPermission: false, summonsCompanion: false }],
    // Cautious: pauses for permission mid-fight, and keeps watch over
    // background tasks before finishing.
    ['prod-deploy', { pace: 1800, questLength: 10, restMs: 3000, failsSometimes: false, asksPermission: true, summonsCompanion: false, watchesBackground: true }],
    // Party: summons a companion that shares the fight.
    ['data-pipeline', { pace: 1400, questLength: 14, restMs: 2500, failsSometimes: false, asksPermission: false, summonsCompanion: true }],
    // Mixed bag.
    ['web-app', { pace: 1500, questLength: 9, restMs: 2000, failsSometimes: true, asksPermission: true, summonsCompanion: false }],
  ];

  profiles.slice(0, SESSION_COUNT).forEach(([id, profile], i) => {
    setTimeout(() => runSession(emit, id, profile), i * 400);
  });
}
