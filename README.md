# agent-quest

A [Rusty's Retirement](https://store.steampowered.com/app/2666510/Rustys_Retirement/)-style
desktop strip that visualizes your live **Claude Code** sessions as pixel-art RPG
adventurers. A thin, transparent, always-on-top bar docks to the bottom of your
screen — glanceable, never in the way, never steals focus.

```
┌──────────────────────────────────────────────────────────────┐
│  🧙⚔️  my-api Edit     🏹 web-app WebSearch    🧝💤 docs  🔥  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ grass & dirt ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
└──────────────────────────────────────────────────────────────┘
```

Each Claude Code session is one adventurer (named after its project directory):

| Claude Code activity | Hero behavior |
|---|---|
| `Read` / `Grep` / `Glob` | reads a scroll |
| `Edit` / `Write` | sword swing |
| `Bash` | casts a spell |
| `Task` (subagent) | summons a smaller companion hero |
| `WebSearch` / `WebFetch` / MCP tools | shoots a bow |
| tool failure | flinches (hurt) |
| permission request | blinking exclamation mark |
| finished / waiting for you | sits at a campfire, zzz |
| session ends | walks off screen |

## Requirements

- macOS (primary target; window is a non-activating NSPanel)
- Claude Code

## Install

### Option 1: Download (recommended)

1. Grab the latest `.dmg` from [Releases](https://github.com/zodius-chtsec/agent-quest/releases)
2. Drag **agent-quest.app** into Applications
3. The app is **not code-signed** — clear the quarantine flag once:
   ```bash
   xattr -cr /Applications/agent-quest.app
   ```
4. Launch it, then click the tray icon → **Install Claude Code hooks**
5. Restart any running Claude Code sessions — heroes appear as they work

### Option 2: Homebrew

```bash
brew install --cask zodius-chtsec/tap/agent-quest
xattr -cr /Applications/agent-quest.app   # unsigned app: required once
```

### Option 3: From source

```bash
git clone https://github.com/zodius-chtsec/agent-quest && cd agent-quest
pnpm install
pnpm tauri build        # needs Rust toolchain + pnpm
./src-tauri/target/release/agent-quest install-hooks
```

## How hook installation works

The tray "Install Claude Code hooks" (or the `install-hooks` CLI subcommand)
merges agent-quest entries into `~/.claude/settings.json`:

- **append-only** — your existing hooks are never modified or reordered
- a timestamped backup is written to `~/.claude/backups/` first
- the hook command is a forwarder script (`~/.claude/agent-quest-hook.sh`) that
  POSTs each event to `127.0.0.1:7777` with `--max-time 1` and always exits 0,
  so Claude Code is never blocked — even when agent-quest isn't running
- "Uninstall Claude Code hooks" / `uninstall-hooks` removes exactly the
  entries it added

## Controls

- **Tray menu**: toggle click-through, re-dock, quit
- **Click a hero**: session info card (project, state, tool, uptime, cwd)

## Development

```bash
pnpm tauri dev                          # run the app
pnpm test                               # vitest (FSM, store, layout, parsing)
cargo test --manifest-path src-tauri/Cargo.toml   # settings.json merge safety
./scripts/send-fake-event.sh PreToolUse demo Edit # drive the strip w/o Claude Code
open "http://localhost:1420/?demo=1"              # scripted demo in a browser
```

Environment:

- `AGENT_QUEST_PORT` — override the forwarder's target port (default 7777;
  the app falls back through 7778–7782 if busy)
- `AGENT_QUEST_IGNORE_CWD` — comma-separated cwd prefixes whose sessions are
  hidden (e.g. agent-quest's own dev session)

## Art

Ships with built-in procedural pixel art (zero downloads). Optionally upgrade
to [Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords) by Pixel Frog —
see `scripts/fetch-assets.sh`; those files are gitignored because the pack may
not be redistributed.

## Known limitations

- macOS fullscreen Spaces cover the strip (OS limitation)
- Token/cost stats aren't shown (not available in hook payloads)
