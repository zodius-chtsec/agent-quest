//! Embedded hook-event server: Claude Code hook commands POST their stdin
//! JSON here; we forward the raw payload to the webview as a "hook" event.
//! The frontend owns the payload schema — no parsing happens in Rust.

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use tauri::{AppHandle, Emitter};

pub const DEFAULT_PORT: u16 = 7777;
/// Fallback ports if the default is taken by another process.
pub const PORT_RANGE: std::ops::RangeInclusive<u16> = 7777..=7782;

#[derive(Clone)]
struct ServerState {
    app: AppHandle,
    /// cwd prefixes whose events are dropped (AGENT_QUEST_IGNORE_CWD,
    /// comma-separated). Lets users hide e.g. agent-quest's own dev session.
    ignored_cwds: std::sync::Arc<Vec<String>>,
}

fn ignored_cwds_from_env() -> Vec<String> {
    std::env::var("AGENT_QUEST_IGNORE_CWD")
        .map(|raw| {
            raw.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

async fn handle_hook(
    State(state): State<ServerState>,
    Json(payload): Json<serde_json::Value>,
) -> StatusCode {
    if let Some(cwd) = payload["cwd"].as_str() {
        if state.ignored_cwds.iter().any(|p| cwd.starts_with(p.as_str())) {
            return StatusCode::OK;
        }
    }
    if let Err(err) = state.app.emit("hook", &payload) {
        eprintln!("[server] emit failed: {err}");
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::OK
}

async fn handle_health() -> &'static str {
    "agent-quest ok"
}

/// Bind the first free port in PORT_RANGE and serve forever.
/// Returns the bound port.
pub fn start(app: AppHandle) -> std::io::Result<u16> {
    let listener = bind_first_free()?;
    let port = listener.local_addr()?.port();
    listener.set_nonblocking(true)?;

    std::thread::spawn(move || {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_io()
            .build()
            .expect("tokio runtime");
        runtime.block_on(async move {
            let state = ServerState {
                app,
                ignored_cwds: std::sync::Arc::new(ignored_cwds_from_env()),
            };
            let router = Router::new()
                .route("/hook", post(handle_hook))
                .route("/health", get(handle_health))
                .with_state(state);
            let listener = tokio::net::TcpListener::from_std(listener)
                .expect("tcp listener");
            if let Err(err) = axum::serve(listener, router).await {
                eprintln!("[server] serve error: {err}");
            }
        });
    });

    Ok(port)
}

fn bind_first_free() -> std::io::Result<std::net::TcpListener> {
    let mut last_err = None;
    for port in PORT_RANGE {
        match std::net::TcpListener::bind(("127.0.0.1", port)) {
            Ok(listener) => return Ok(listener),
            Err(err) => last_err = Some(err),
        }
    }
    Err(last_err.unwrap_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::AddrInUse, "no free port in range")
    }))
}
