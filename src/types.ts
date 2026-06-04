/** Hero finite states. */
export type HeroState =
  | 'ARRIVING'
  | 'IDLE'
  | 'WORKING'
  /** Turn ended but background tasks (monitors, bg shells) are running. */
  | 'WATCHING'
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
  /** Stop event: number of still-running background tasks. */
  readonly bgTasks?: number;
}

/** Monster evolution tiers: slime → goblin → ogre → dragon. */
export type MonsterTier = 0 | 1 | 2 | 3;

export type MonsterState = 'FIGHTING' | 'DYING';

/** One monster per main session, representing the current task (turn). */
export interface MonsterInfo {
  /** Same as the owning session's id (main sessions only). */
  readonly sessionId: string;
  readonly state: MonsterState;
  readonly tier: MonsterTier;
  /** Elemental family (palette), rolled at spawn time. */
  readonly species: number;
  /** Total hits landed (tool calls) across the whole fight. */
  readonly hits: number;
  /** 0..1 progress toward the next evolution (1 = max tier reached). */
  readonly tierProgress: number;
  readonly spawnedAt: number;
  /** Timestamp of the most recent hit, for hit-flash effects. */
  readonly lastHitAt: number;
  /** Timestamp of the monster's last counterattack (tool failure). */
  readonly lastCounterAt: number;
  readonly diedAt?: number;
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
  /** Running background tasks (only meaningful in WATCHING). */
  readonly bgTasks: number;
  readonly lastSeen: number;
  readonly startedAt: number;
}
