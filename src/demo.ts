/**
 * Demo driver (?demo=1): feeds scripted fake events through the same store
 * pipeline as real hooks, for development without Claude Code.
 */

import type { QuestEvent } from './types';

type Emit = (event: QuestEvent) => void;

const TOOLS = ['Read', 'Edit', 'Bash', 'Grep', 'Write', 'WebSearch'];

function ev(partial: Partial<QuestEvent> & Pick<QuestEvent, 'kind' | 'sessionId'>): QuestEvent {
  return { cwd: `/Users/demo/code/${partial.sessionId}`, ...partial } as QuestEvent;
}

/** pre-tool, then the landed hit shortly after. */
function swing(emit: Emit, sessionId: string, tool: string, agentId?: string, agentType?: string): void {
  emit(ev({ kind: 'pre-tool', sessionId, tool, agentId, agentType }));
  setTimeout(() => emit(ev({ kind: 'post-tool', sessionId, tool, agentId, agentType })), 600);
}

export function startDemo(emit: Emit): void {
  const sessions = ['alpha-api', 'web-app', 'data-pipeline'];

  sessions.forEach((id, i) => {
    setTimeout(() => {
      emit(ev({ kind: 'session-start', sessionId: id }));
      emit(ev({ kind: 'prompt', sessionId: id }));
    }, i * 1500);
  });

  // alpha-api: relentless grinder — watch the monster evolve to dragon,
  // then a kill + fresh monster every ~50s.
  let alphaSwings = 0;
  setInterval(() => {
    alphaSwings++;
    if (alphaSwings % 24 === 0) {
      emit(ev({ kind: 'stop', sessionId: 'alpha-api', fullyIdle: true }));
      setTimeout(() => emit(ev({ kind: 'prompt', sessionId: 'alpha-api' })), 3000);
      return;
    }
    swing(emit, 'alpha-api', TOOLS[Math.floor(Math.random() * TOOLS.length)]);
  }, 2100);

  // web-app: short quests with mishaps — fail (counterattack), permission
  // pause, kill, rest, new quest.
  let webPhase = 0;
  setInterval(() => {
    webPhase = (webPhase + 1) % 7;
    if (webPhase < 2) swing(emit, 'web-app', 'Edit');
    else if (webPhase === 2) emit(ev({ kind: 'tool-fail', sessionId: 'web-app', tool: 'Bash' }));
    else if (webPhase === 3) emit(ev({ kind: 'permission', sessionId: 'web-app' }));
    else if (webPhase === 4) swing(emit, 'web-app', 'Bash');
    else if (webPhase === 5) emit(ev({ kind: 'stop', sessionId: 'web-app', fullyIdle: true }));
    else emit(ev({ kind: 'prompt', sessionId: 'web-app' }));
  }, 4000);

  // data-pipeline: summons a companion; both pile damage onto the same
  // monster, then the quest completes.
  let pipePhase = 0;
  setInterval(() => {
    pipePhase = (pipePhase + 1) % 4;
    if (pipePhase === 1) {
      swing(emit, 'data-pipeline', 'Task');
      emit(ev({ kind: 'subagent-start', sessionId: 'data-pipeline', agentId: 'sub-1', agentType: 'Explore' }));
      swing(emit, 'data-pipeline', 'Grep', 'sub-1', 'Explore');
    } else if (pipePhase === 2) {
      swing(emit, 'data-pipeline', 'Read', 'sub-1', 'Explore');
      swing(emit, 'data-pipeline', 'Edit');
    } else if (pipePhase === 3) {
      emit(ev({ kind: 'subagent-stop', sessionId: 'data-pipeline', agentId: 'sub-1' }));
      emit(ev({ kind: 'stop', sessionId: 'data-pipeline', fullyIdle: true }));
    } else {
      emit(ev({ kind: 'prompt', sessionId: 'data-pipeline' }));
    }
  }, 6000);
}
