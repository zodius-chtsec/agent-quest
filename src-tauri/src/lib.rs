mod server;
mod tray;
mod window;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

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
