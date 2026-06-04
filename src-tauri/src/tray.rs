//! System tray: the only always-available control surface, since the strip
//! itself is frameless and may be in click-through mode.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{CheckMenuItem, Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

use crate::window;

static INTERACTIVE: AtomicBool = AtomicBool::new(true);
static DEMO: AtomicBool = AtomicBool::new(false);
static SCENERY: AtomicBool = AtomicBool::new(false);

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let interactive =
        CheckMenuItem::with_id(app, "interactive", "Interactive (clickable)", true, true, None::<&str>)?;
    let demo = CheckMenuItem::with_id(app, "demo", "Demo mode", true, false, None::<&str>)?;
    let scenery =
        CheckMenuItem::with_id(app, "scenery", "Scenery background", true, false, None::<&str>)?;
    let redock = MenuItem::with_id(app, "redock", "Re-dock to bottom", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit agent-quest", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&interactive, &demo, &scenery, &redock, &quit])?;

    TrayIconBuilder::with_id("agent-quest-tray")
        .icon(app.default_window_icon().expect("bundled icon").clone())
        .icon_as_template(true)
        .tooltip("agent-quest")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "interactive" => {
                let now = !INTERACTIVE.load(Ordering::Relaxed);
                INTERACTIVE.store(now, Ordering::Relaxed);
                let _ = interactive.set_checked(now);
                window::set_interactive(app, now);
            }
            "demo" => {
                let now = !DEMO.load(Ordering::Relaxed);
                DEMO.store(now, Ordering::Relaxed);
                let _ = demo.set_checked(now);
                if let Some(win) = app.get_webview_window(window::STRIP_LABEL) {
                    // Reassigning location.search reloads the page, which
                    // also cleanly stops a running demo's timers.
                    let js = if now {
                        "location.search='?demo=1'"
                    } else {
                        "location.search=''"
                    };
                    let _ = win.eval(js);
                }
            }
            "scenery" => {
                let now = !SCENERY.load(Ordering::Relaxed);
                SCENERY.store(now, Ordering::Relaxed);
                let _ = scenery.set_checked(now);
                if let Some(win) = app.get_webview_window(window::STRIP_LABEL) {
                    let js = if now {
                        "localStorage.setItem('agentquest-scenery','1'); location.reload()"
                    } else {
                        "localStorage.removeItem('agentquest-scenery'); location.reload()"
                    };
                    let _ = win.eval(js);
                }
            }
            "redock" => {
                if let Some(win) = app.get_webview_window(window::STRIP_LABEL) {
                    if let Err(err) = window::dock_to_primary(&win) {
                        eprintln!("[tray] re-dock failed: {err}");
                    }
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
