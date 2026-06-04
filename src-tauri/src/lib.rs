mod hooks_cli;
mod hooks_merge;
mod server;
mod tray;
mod window;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // CLI subcommands: the binary doubles as the hook installer.
    match std::env::args().nth(1).as_deref() {
        Some("install-hooks") => return exit_after(hooks_cli::install()),
        Some("uninstall-hooks") => return exit_after(hooks_cli::uninstall()),
        _ => {}
    }

    let mut builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![hooks_installed]);

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .setup(|app| {
            let handle = app.handle();

            // Hide from Dock: this is an ambient overlay, not a regular app.
            #[cfg(target_os = "macos")]
            handle.set_activation_policy(tauri::ActivationPolicy::Accessory)?;

            if let Some(win) = handle.get_webview_window(window::STRIP_LABEL) {
                window::dock_to_primary(&win)?;
            }
            window::make_nonactivating_panel(handle);
            window::watch_monitor_changes(handle);
            tray::setup(handle)?;

            match server::start(handle.clone()) {
                Ok(port) => println!("[server] listening on 127.0.0.1:{port}"),
                Err(err) => eprintln!("[server] failed to start: {err}"),
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Frontend query: are the Claude Code hooks installed? Drives the
/// empty-state hint on the strip.
#[tauri::command]
fn hooks_installed() -> bool {
    hooks_cli::is_installed()
}

fn exit_after(result: Result<(), String>) {
    if let Err(message) = result {
        eprintln!("error: {message}");
        std::process::exit(1);
    }
}
