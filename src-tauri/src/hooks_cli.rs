//! IO layer for hook installation: backup, forwarder script, atomic write.
//! All JSON manipulation is delegated to the pure `hooks_merge` module.

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::hooks_merge;

const FORWARDER: &str = r#"#!/bin/sh
# agent-quest hook forwarder (installed by `agent-quest install-hooks`).
# Reads the hook payload from stdin and forwards it to the running
# agent-quest app. NEVER blocks Claude Code: 1s max, always exits 0.
PORT="${AGENT_QUEST_PORT:-7777}"
curl -s --max-time 1 -X POST -H 'Content-Type: application/json' \
  --data-binary @- "http://127.0.0.1:$PORT/hook" >/dev/null 2>&1
exit 0
"#;

fn claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|h| h.join(".claude"))
        .ok_or_else(|| "cannot resolve home directory".to_string())
}

fn read_settings(path: &PathBuf) -> Result<serde_json::Value, String> {
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let text = fs::read_to_string(path).map_err(|e| format!("read {path:?}: {e}"))?;
    // Fail loudly on invalid JSON: never risk clobbering a file we can't parse.
    serde_json::from_str(&text).map_err(|e| format!("{path:?} is not valid JSON ({e}); aborting without changes"))
}

fn backup(path: &PathBuf) -> Result<Option<PathBuf>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let dir = claude_dir()?.join("backups");
    fs::create_dir_all(&dir).map_err(|e| format!("create {dir:?}: {e}"))?;
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let dest = dir.join(format!("settings.json.agentquest-{ts}.bak"));
    fs::copy(path, &dest).map_err(|e| format!("backup to {dest:?}: {e}"))?;
    Ok(Some(dest))
}

fn write_atomic(path: &PathBuf, value: &serde_json::Value) -> Result<(), String> {
    let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.agentquest-tmp");
    fs::write(&tmp, &text).map_err(|e| format!("write {tmp:?}: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("rename {tmp:?} -> {path:?}: {e}"))?;
    Ok(())
}

pub fn install() -> Result<(), String> {
    let claude = claude_dir()?;
    let settings_path = claude.join("settings.json");
    let script_path = claude.join("agent-quest-hook.sh");

    let settings = read_settings(&settings_path)?;
    if hooks_merge::is_fully_installed(&settings) {
        println!("agent-quest hooks already installed; nothing to do.");
        return Ok(());
    }

    fs::create_dir_all(&claude).map_err(|e| format!("create {claude:?}: {e}"))?;
    fs::write(&script_path, FORWARDER).map_err(|e| format!("write {script_path:?}: {e}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&script_path, fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("chmod {script_path:?}: {e}"))?;
    }

    if let Some(bak) = backup(&settings_path)? {
        println!("backed up settings to {}", bak.display());
    }

    let command = script_path.to_string_lossy().to_string();
    let merged = hooks_merge::merge_hooks(&settings, &command);
    write_atomic(&settings_path, &merged)?;

    println!("installed agent-quest hooks for {} events:", hooks_merge::EVENTS.len());
    for (event, _) in hooks_merge::EVENTS {
        println!("  - {event}");
    }
    println!("forwarder: {}", script_path.display());
    println!("restart running Claude Code sessions to pick up the new hooks.");
    Ok(())
}

pub fn uninstall() -> Result<(), String> {
    let claude = claude_dir()?;
    let settings_path = claude.join("settings.json");
    let script_path = claude.join("agent-quest-hook.sh");

    let settings = read_settings(&settings_path)?;
    let cleaned = hooks_merge::unmerge_hooks(&settings);

    if cleaned == settings {
        println!("no agent-quest hooks found in settings.json.");
    } else {
        if let Some(bak) = backup(&settings_path)? {
            println!("backed up settings to {}", bak.display());
        }
        write_atomic(&settings_path, &cleaned)?;
        println!("removed agent-quest hook entries from settings.json.");
    }

    if script_path.exists() {
        fs::remove_file(&script_path).map_err(|e| format!("remove {script_path:?}: {e}"))?;
        println!("removed forwarder {}", script_path.display());
    }
    Ok(())
}
