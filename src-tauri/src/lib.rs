use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

#[tauri::command]
fn open_chat_window(app: AppHandle) -> Result<(), String> {
    // 如果聊天窗口已存在，聚焦它
    if let Some(window) = app.get_webview_window("chat") {
        window.show().map_err(|e: tauri::Error| e.to_string())?;
        window.set_focus().map_err(|e: tauri::Error| e.to_string())?;
        return Ok(());
    }

    // 获取 mascot 窗口的位置来决定聊天窗口的位置
    let (chat_x, chat_y) = if let Some(mascot) = app.get_webview_window("mascot") {
        if let Ok(pos) = mascot.outer_position() {
            // 聊天窗口在看板娘左边
            (pos.x as f64 - 440.0, pos.y as f64 - 100.0)
        } else {
            (400.0, 200.0)
        }
    } else {
        (400.0, 200.0)
    };

    // 创建聊天窗口
    let _chat_window = WebviewWindowBuilder::new(
        &app,
        "chat",
        WebviewUrl::App("/".into()),
    )
    .title("Madoka Chat")
    .inner_size(420.0, 650.0)
    .min_inner_size(380.0, 500.0)
    .position(chat_x.max(0.0), chat_y.max(0.0))
    .decorations(false)
    .shadow(true)
    .resizable(true)
    .visible(true)
    .focused(true)
    .build()
    .map_err(|e: tauri::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn close_chat_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("chat") {
        window.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn toggle_chat_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("chat") {
        if window.is_visible().unwrap_or(false) {
            window.close().map_err(|e: tauri::Error| e.to_string())?;
        } else {
            window.show().map_err(|e: tauri::Error| e.to_string())?;
            window.set_focus().map_err(|e: tauri::Error| e.to_string())?;
        }
    } else {
        open_chat_window(app)?;
    }
    Ok(())
}

#[tauri::command]
fn start_dragging(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.start_dragging().map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_mascot_ignore_cursor(app: AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("mascot") {
        window.set_ignore_cursor_events(ignore).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_chat_window,
            close_chat_window,
            toggle_chat_window,
            start_dragging,
            set_mascot_ignore_cursor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
