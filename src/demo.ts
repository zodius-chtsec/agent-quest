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

export function startDemo(emit: Emit): void {
  const sessions = ['alpha-api', 'web-app', 'data-pipeline'];

  sessions.forEach((id, i) => {
    setTimeout(() => {
      emit(ev({ kind: 'session-start', sessionId: id }));
      emit(ev({ kind: 'prompt', sessionId: id }));
    }, i * 1500);
  });

  // alpha-api: busy worker cycling tools.
  setInterval(() => {
    const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
    emit(ev({ kind: 'pre-tool', sessionId: 'alpha-api', tool }));
  }, 2500);

  // web-app: works, occasionally fails, asks permission, then rests.
  let webPhase = 0;
  setInterval(() => {
    webPhase = (webPhase + 1) % 6;
    if (webPhase < 2) emit(ev({ kind: 'pre-tool', sessionId: 'web-app', tool: 'Edit' }));
    else if (webPhase === 2) emit(ev({ kind: 'tool-fail', sessionId: 'web-app', tool: 'Bash' }));
    else if (webPhase === 3) emit(ev({ kind: 'permission', sessionId: 'web-app' }));
    else if (webPhase === 4) emit(ev({ kind: 'stop', sessionId: 'web-app', fullyIdle: true }));
  }, 4000);

  // data-pipeline: summons a subagent companion periodically.
  let companionUp = false;
  setInterval(() => {
    if (!companionUp) {
      emit(ev({ kind: 'pre-tool', sessionId: 'data-pipeline', tool: 'Task' }));
      emit(ev({ kind: 'subagent-start', sessionId: 'data-pipeline', agentId: 'sub-1', agentType: 'Explore' }));
      emit(ev({ kind: 'pre-tool', sessionId: 'data-pipeline', agentId: 'sub-1', agentType: 'Explore', tool: 'Grep' }));
    } else {
      emit(ev({ kind: 'subagent-stop', sessionId: 'data-pipeline', agentId: 'sub-1' }));
      emit(ev({ kind: 'stop', sessionId: 'data-pipeline', fullyIdle: true }));
    }
    companionUp = !companionUp;
  }, 9000);
}
