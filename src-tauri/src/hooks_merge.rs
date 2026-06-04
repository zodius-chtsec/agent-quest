//! Pure merge/unmerge of agent-quest hook entries into a Claude Code
//! settings.json value. No IO here — fully unit-testable. The invariant
//! that matters: existing user hooks (e.g. claude-island) are NEVER
//! modified, reordered, or removed.

use serde_json::{json, Value};

/// Substring that identifies hook groups owned by agent-quest.
pub const MARKER: &str = "agent-quest-hook.sh";

/// Events we subscribe to. `true` = event supports a tool/type matcher.
pub const EVENTS: &[(&str, bool)] = &[
    ("SessionStart", false),
    ("UserPromptSubmit", false),
    ("PreToolUse", true),
    ("PostToolUse", true),
    ("PostToolUseFailure", true),
    ("Stop", false),
    ("SubagentStart", false),
    ("SubagentStop", false),
    ("PermissionRequest", true),
    ("SessionEnd", false),
];

fn our_group(hook_command: &str, with_matcher: bool) -> Value {
    let entry = json!({
        "hooks": [{
            "type": "command",
            "command": hook_command,
            "timeout": 3
        }]
    });
    if with_matcher {
        let mut obj = entry;
        obj["matcher"] = json!("*");
        obj
    } else {
        entry
    }
}

fn group_is_ours(group: &Value, marker: &str) -> bool {
    group["hooks"]
        .as_array()
        .map(|hooks| {
            hooks.iter().any(|h| {
                h["command"]
                    .as_str()
                    .map(|c| c.contains(marker))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// Returns a NEW settings value with our hook groups appended. Idempotent:
/// events that already contain the marker are left untouched.
pub fn merge_hooks(settings: &Value, hook_command: &str) -> Value {
    let mut next = settings.clone();
    if !next.is_object() {
        next = json!({});
    }
    if !next["hooks"].is_object() {
        next["hooks"] = json!({});
    }

    for (event, with_matcher) in EVENTS {
        let groups = next["hooks"][event].as_array().cloned().unwrap_or_default();
        if groups.iter().any(|g| group_is_ours(g, MARKER)) {
            continue;
        }
        let mut updated = groups;
        updated.push(our_group(hook_command, *with_matcher));
        next["hooks"][event] = Value::Array(updated);
    }
    next
}

/// Returns a NEW settings value with every group containing MARKER removed.
/// Event arrays that end up empty are dropped; everything else is preserved
/// byte-for-byte.
pub fn unmerge_hooks(settings: &Value) -> Value {
    let mut next = settings.clone();
    let Some(hooks) = next["hooks"].as_object_mut() else {
        return next;
    };

    let events: Vec<String> = hooks.keys().cloned().collect();
    for event in events {
        if let Some(groups) = hooks[&event].as_array() {
            let kept: Vec<Value> = groups
                .iter()
                .filter(|g| !group_is_ours(g, MARKER))
                .cloned()
                .collect();
            if kept.is_empty() && groups.iter().all(|g| group_is_ours(g, MARKER)) {
                hooks.remove(&event);
            } else if kept.len() != groups.len() {
                hooks[&event] = Value::Array(kept);
            }
        }
    }
    next
}

/// True when every event we manage already has our hook group.
pub fn is_fully_installed(settings: &Value) -> bool {
    EVENTS.iter().all(|(event, _)| {
        settings["hooks"][event]
            .as_array()
            .map(|groups| groups.iter().any(|g| group_is_ours(g, MARKER)))
            .unwrap_or(false)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CMD: &str = "/Users/me/.claude/agent-quest-hook.sh";

    /// Mirrors the real-world shape: claude-island hooks on most events,
    /// mixed matcher usage, and a custom timeout on PermissionRequest.
    fn claude_island_fixture() -> Value {
        json!({
            "model": "opus",
            "hooks": {
                "SessionStart": [{
                    "hooks": [{ "type": "command", "command": "python3 '/Users/me/.claude/hooks/claude-island-state.py'" }]
                }],
                "PreToolUse": [{
                    "matcher": "*",
                    "hooks": [{ "type": "command", "command": "python3 '/Users/me/.claude/hooks/claude-island-state.py'" }]
                }],
                "PermissionRequest": [{
                    "matcher": "*",
                    "hooks": [{
                        "type": "command",
                        "command": "python3 '/Users/me/.claude/hooks/claude-island-state.py'",
                        "timeout": 86400
                    }]
                }],
                "Stop": [{
                    "hooks": [{ "type": "command", "command": "python3 '/Users/me/.claude/hooks/claude-island-state.py'" }]
                }]
            }
        })
    }

    #[test]
    fn merge_preserves_existing_hooks_exactly() {
        let original = claude_island_fixture();
        let merged = merge_hooks(&original, CMD);

        // claude-island's groups are still the FIRST entries, untouched.
        for event in ["SessionStart", "PreToolUse", "PermissionRequest", "Stop"] {
            assert_eq!(
                merged["hooks"][event][0], original["hooks"][event][0],
                "existing group for {event} must be preserved"
            );
        }
        // Custom timeout survives.
        assert_eq!(merged["hooks"]["PermissionRequest"][0]["hooks"][0]["timeout"], 86400);
        // Other top-level keys survive.
        assert_eq!(merged["model"], "opus");
    }

    #[test]
    fn merge_adds_all_events() {
        let merged = merge_hooks(&claude_island_fixture(), CMD);
        assert!(is_fully_installed(&merged));
        // Events that didn't exist get created with exactly one (our) group.
        assert_eq!(merged["hooks"]["SessionEnd"].as_array().unwrap().len(), 1);
        // Shared events get appended: island + ours.
        assert_eq!(merged["hooks"]["PreToolUse"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn merge_is_idempotent() {
        let once = merge_hooks(&claude_island_fixture(), CMD);
        let twice = merge_hooks(&once, CMD);
        assert_eq!(once, twice);
    }

    #[test]
    fn unmerge_restores_original() {
        let original = claude_island_fixture();
        let merged = merge_hooks(&original, CMD);
        let restored = unmerge_hooks(&merged);
        assert_eq!(restored, original);
    }

    #[test]
    fn unmerge_never_touches_foreign_groups() {
        let original = claude_island_fixture();
        let restored = unmerge_hooks(&original);
        assert_eq!(restored, original);
    }

    #[test]
    fn merge_handles_empty_and_missing_settings() {
        let merged = merge_hooks(&json!({}), CMD);
        assert!(is_fully_installed(&merged));
        let merged_null = merge_hooks(&Value::Null, CMD);
        assert!(is_fully_installed(&merged_null));
    }

    #[test]
    fn matcher_only_on_tool_events() {
        let merged = merge_hooks(&json!({}), CMD);
        assert_eq!(merged["hooks"]["PreToolUse"][0]["matcher"], "*");
        assert_eq!(merged["hooks"]["PostToolUseFailure"][0]["matcher"], "*");
        assert!(merged["hooks"]["SessionStart"][0]["matcher"].is_null());
        assert!(merged["hooks"]["Stop"][0]["matcher"].is_null());
    }
}
