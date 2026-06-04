/** Hero finite states. */
export type HeroState =
  | 'ARRIVING'
  | 'IDLE'
  | 'WORKING'
  | 'ATTENTION'
  | 'HURT'
  | 'LEAVING';

/** Visual action performed while WORKING, derived from the tool name. */
export type HeroAction = 'scout' | 'attack' | 'cast' | 'summon' | 'bow' | 'generic';

/** Normalized internal event, parsed from a raw Claude Code hook payload. */
export interface QuestEvent {
  readonly kind:
    | 'session-start'
    | 'prompt'
    | 'pre-tool'
    | 'post-tool'
    | 'tool-fail'
    | 'stop'
    | 'permission'
    | 'notification'
    | 'session-end'
    | 'subagent-start'
    | 'subagent-stop';
  readonly sessionId: string;
  readonly cwd: string;
  /** Tool name for pre-tool/post-tool/tool-fail events. */
  readonly tool?: string;
  /** Subagent identity when the event originates from a subagent. */
  readonly agentId?: string;
  readonly agentType?: string;
  /** Stop event: true when no background tasks remain. */
  readonly fullyIdle?: boolean;
}

/** A live session (or subagent) shown as one hero on the strip. */
export interface SessionInfo {
  /** session_id, or `${session_id}:${agent_id}` for subagent companions. */
  readonly id: string;
  readonly sessionId: string;
  readonly cwd: string;
  readonly projectName: string;
  readonly isCompanion: boolean;
  readonly parentId?: string;
  readonly agentType?: string;
  readonly state: HeroState;
  readonly action: HeroAction;
  readonly currentTool?: string;
  readonly lastSeen: number;
  readonly startedAt: number;
}
