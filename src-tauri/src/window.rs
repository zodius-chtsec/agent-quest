//! Strip window management: non-activating NSPanel conversion (macOS) and
//! docking the window to the bottom edge of the primary monitor.

use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewWindow};

pub const STRIP_LABEL: &str = "strip";
pub const STRIP_HEIGHT: f64 = 160.0;

#[cfg(target_os = "macos")]
mod panel {
    #[allow(unused_imports)]
    use tauri::Manager;
    use tauri_nspanel::tauri_panel;

    tauri_panel! {
        panel!(StripPanel {
            config: {
                can_become_key_window: false,
                can_become_main_window: false,
                is_floating_panel: true
            }
        })
    }
}

/// Convert the strip window into a non-activating NSPanel so clicks never
/// steal focus from the frontmost app (workaround for tauri#14102), and make
/// it visible across all Spaces, including as an auxiliary over fullscreen.
#[cfg(target_os = "macos")]
pub fn make_nonactivating_panel(app: &AppHandle) {
    use tauri_nspanel::{CollectionBehavior, PanelLevel, StyleMask, WebviewWindowExt};

    let Some(window) = app.get_webview_window(STRIP_LABEL) else {
        eprintln!("[window] strip window not found, skip panel conversion");
        return;
    };

    match window.to_panel::<panel::StripPanel>() {
        Ok(panel) => {
            panel.set_level(PanelLevel::Status.value());
            panel.set_style_mask(
                StyleMask::empty().borderless().nonactivating_panel().value(),
            );
            panel.set_collection_behavior(
                CollectionBehavior::new()
                    .can_join_all_spaces()
                    .stationary()
                    .full_screen_auxiliary()
                    .ignores_cycle()
                    .value(),
            );
            panel.set_released_when_closed(true);
            panel.order_front_regardless();
        }
        Err(err) => eprintln!("[window] panel conversion failed: {err:?}"),
    }
}

#[cfg(not(target_os = "macos"))]
pub fn make_nonactivating_panel(_app: &AppHandle) {}

/// Pin the strip to the bottom edge of the primary monitor, spanning its
/// full width.
pub fn dock_to_primary(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.primary_monitor()? else {
        return Ok(());
    };

    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let pos = monitor.position().to_logical::<f64>(scale);

    window.set_size(LogicalSize::new(size.width, STRIP_HEIGHT))?;
    window.set_position(LogicalPosition::new(
        pos.x,
        pos.y + size.height - STRIP_HEIGHT,
    ))?;
    Ok(())
}

/// Re-dock whenever the primary monitor geometry changes (resolution switch,
/// display plug/unplug). Polling is the portable way to observe this.
pub fn watch_monitor_changes(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        let mut last: Option<(u32, u32, i32, i32)> = None;
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3));
            let Some(window) = app.get_webview_window(STRIP_LABEL) else {
                continue;
            };
            let Ok(Some(monitor)) = window.primary_monitor() else {
                continue;
            };
            let size = monitor.size();
            let pos = monitor.position();
            let current = (size.width, size.height, pos.x, pos.y);
            if last != Some(current) {
                last = Some(current);
                if let Err(err) = dock_to_primary(&window) {
                    eprintln!("[window] re-dock failed: {err}");
                }
            }
        }
    });
}

/// Toggle whether the strip ignores mouse events (click-through mode).
#[cfg(target_os = "macos")]
pub fn set_interactive(app: &AppHandle, interactive: bool) {
    use tauri_nspanel::ManagerExt;

    if let Ok(panel) = app.get_webview_panel(STRIP_LABEL) {
        panel.set_ignores_mouse_events(!interactive);
    }
}

#[cfg(not(target_os = "macos"))]
pub fn set_interactive(app: &AppHandle, interactive: bool) {
    if let Some(window) = app.get_webview_window(STRIP_LABEL) {
        let _ = window.set_ignore_cursor_events(!interactive);
    }
}
