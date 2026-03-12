use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

#[tauri::command]
fn open_chat_window(app: AppHandle) -> Result<(), String> {
    // 如果聊天窗口已存在，聚焦它
    if let Some(window) = app.get_webview_window("chat") {
        window.show().map_err(|e: tauri::Error| e.to_string())?;
        window.set_focus().map_err(|e: tauri::Error| e.to_string())?;
        return Ok(());
    }

    // 获取 mascot 窗口位置，智能决定聊天窗口位置
    let chat_width = 420.0_f64;
    let chat_height = 650.0_f64;

    let (chat_x, chat_y) = if let Some(mascot) = app.get_webview_window("mascot") {
        let mascot_x = mascot.outer_position().map(|p| p.x as f64).unwrap_or(400.0);
        let mascot_y = mascot.outer_position().map(|p| p.y as f64).unwrap_or(200.0);
        let mascot_w = mascot.outer_size().map(|s| s.width as f64).unwrap_or(800.0);

        // 如果看板娘左边有足够空间（>440px），聊天窗口放左边；否则放右边
        let x = if mascot_x > chat_width + 20.0 {
            mascot_x - chat_width - 10.0
        } else {
            mascot_x + mascot_w + 10.0
        };

        let y = (mascot_y - 50.0).max(30.0);
        (x, y)
    } else {
        (100.0, 100.0)
    };

    // 创建聊天窗口（alwaysOnTop 保证不被桌面其他窗口遮挡）
    let _chat_window = WebviewWindowBuilder::new(
        &app,
        "chat",
        WebviewUrl::App("/".into()),
    )
    .title("Madoka Chat")
    .inner_size(chat_width, chat_height)
    .min_inner_size(380.0, 500.0)
    .position(chat_x.max(10.0), chat_y.max(10.0))
    .decorations(false)
    .shadow(true)
    .resizable(true)
    .visible(true)
    .focused(true)
    .always_on_top(true)
    .build()
    .map_err(|e: tauri::Error| e.to_string())?;

    // mascot 取消 alwaysOnTop，避免 800x750 透明区域遮挡 chat
    if let Some(mascot) = app.get_webview_window("mascot") {
        let _ = mascot.set_always_on_top(false);
    }

    Ok(())
}

#[tauri::command]
fn close_chat_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("chat") {
        window.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    // chat 关闭，恢复 mascot 的 alwaysOnTop
    if let Some(mascot) = app.get_webview_window("mascot") {
        let _ = mascot.set_always_on_top(true);
    }
    Ok(())
}

#[tauri::command]
fn toggle_chat_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("chat") {
        if window.is_visible().unwrap_or(false) {
            window.close().map_err(|e: tauri::Error| e.to_string())?;
            // 恢复 mascot 的 alwaysOnTop
            if let Some(mascot) = app.get_webview_window("mascot") {
                let _ = mascot.set_always_on_top(true);
            }
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
