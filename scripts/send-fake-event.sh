#!/usr/bin/env bash
# Send a fake Claude Code hook event to a running agent-quest, for testing
# the live pipeline without Claude Code.
#
# Usage:
#   ./scripts/send-fake-event.sh PreToolUse my-session Edit
#   ./scripts/send-fake-event.sh Stop my-session
#   ./scripts/send-fake-event.sh PermissionRequest my-session Bash
#   ./scripts/send-fake-event.sh SessionEnd my-session
set -euo pipefail

EVENT="${1:-PreToolUse}"
SESSION="${2:-fake-session}"
TOOL="${3:-}"
PORT="${AGENT_QUEST_PORT:-7777}"
CWD_PATH="${4:-/Users/fake/code/$SESSION}"

payload=$(cat <<EOF
{
  "hook_event_name": "$EVENT",
  "session_id": "$SESSION",
  "transcript_path": "/tmp/fake.jsonl",
  "cwd": "$CWD_PATH"$([ -n "$TOOL" ] && printf ',\n  "tool_name": "%s"' "$TOOL")
}
EOF
)

echo "$payload" | curl -s --max-time 2 -X POST \
  -H 'Content-Type: application/json' \
  --data-binary @- "http://127.0.0.1:$PORT/hook"
echo " -> sent $EVENT for $SESSION${TOOL:+ ($TOOL)}"
