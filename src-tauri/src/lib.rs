use tauri::{
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, Position, image::Image
};
use std::collections::HashSet;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::time::{SystemTime, Duration};
use chrono::DateTime;
use serde::Serialize;
use serde_json::Value;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageData {
    pub used_percent: f64,
    pub remaining_percent: f64,
    pub used: u64,
    pub limit: u64,
    pub history: Vec<f64>,
    pub api_used_percent: Option<f64>,
    pub api_reset_at: Option<String>,
}

static API_CACHE: std::sync::Mutex<Option<(std::time::Instant, Option<f64>, Option<String>)>> = std::sync::Mutex::new(None);

#[tauri::command]
async fn get_claude_usage() -> Result<UsageData, String> {
    let (used_percent, total_credits, limit, history, base_dir): (f64, u64, u64, Vec<f64>, Option<std::path::PathBuf>) = tokio::task::spawn_blocking(|| {
        let mut total_credits = 0u64;
        let limit = 25_000_000u64;
        let base_dir = dirs::home_dir().map(|h| h.join(".claude"));

        let projects_dir = base_dir.clone()
            .map(|p| p.join("projects"))
            .ok_or_else(|| "Could not find config directory".to_string())?;

        if !projects_dir.exists() {
            return Err("Claude projects directory not found".to_string());
        }

        let five_hours = Duration::from_secs(5 * 3600);
        let twenty_four_hours = Duration::from_secs(24 * 3600);
        let mut seen_uuids = HashSet::new();
        let mut history = vec![0f64; 24]; // 24 buckets for the last 24 hours

        if let Ok(entries) = std::fs::read_dir(projects_dir) {
            let now = SystemTime::now();
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }
                let Ok(session_files) = std::fs::read_dir(&path) else { continue };
                for session_entry in session_files.filter_map(|e| e.ok()) {
                    let session_path = session_entry.path();
                    if session_path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                        continue;
                    }
                    let Ok(file) = File::open(&session_path) else { continue };
                    let reader = BufReader::new(file);
                    for line in reader.lines().filter_map(|l| l.ok()) {
                        let Ok(json) = serde_json::from_str::<Value>(&line) else { continue };

                        if let Some(uuid) = json.get("uuid").and_then(|u| u.as_str()) {
                            if !seen_uuids.insert(uuid.to_string()) {
                                continue;
                            }
                        }

                        let Some(usage) = json.get("message").and_then(|m| m.get("usage")) else { continue };
                        let msg_credits = ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"]
                            .iter()
                            .filter_map(|field| usage.get(field).and_then(|v| v.as_f64()))
                            .sum::<f64>();
                        if msg_credits <= 0.0 {
                            continue;
                        }

                        let Some(ts_str) = json.get("timestamp").and_then(|t| t.as_str()) else { continue };
                        let Ok(dt) = DateTime::parse_from_rfc3339(ts_str) else { continue };
                        let msg_time = SystemTime::from(dt);

                        let Ok(duration) = now.duration_since(msg_time) else { continue };
                        if duration <= five_hours {
                            total_credits += msg_credits as u64;
                        }

                        if duration <= twenty_four_hours {
                            let hours_ago = (duration.as_secs() / 3600) as usize;
                            if hours_ago < 24 {
                                let bucket_index = 23 - hours_ago;
                                history[bucket_index] += msg_credits;
                            }
                        }
                    }
                }
            }
        }

        let used_percent = (total_credits as f64 / limit as f64) * 100.0;
        
        Ok((used_percent, total_credits, limit, history, base_dir))
    }).await.unwrap_or_else(|_| Err("Failed to execute blocking task".to_string()))?;

    let mut usage_data = UsageData {
        used_percent: used_percent.min(100.0),
        remaining_percent: (100.0 - used_percent).max(0.0),
        used: total_credits,
        limit,
        history,
        api_used_percent: None,
        api_reset_at: None,
    };

    let mut should_fetch = false;
    if let Ok(cache) = API_CACHE.lock() {
        match &*cache {
            Some((time, util, reset)) if time.elapsed() < std::time::Duration::from_secs(120) => {
                usage_data.api_used_percent = util.clone();
                usage_data.api_reset_at = reset.clone();
                if let Some(u) = util {
                    usage_data.used_percent = *u;
                    usage_data.remaining_percent = (100.0 - *u).max(0.0);
                }
            }
            _ => {
                should_fetch = true;
            }
        }
    }

    // Attempt to fetch real API usage
    if should_fetch {
        let mut new_util = None;
        let mut new_reset = None;

        if let Some(base) = base_dir {
            let creds_path = base.join(".credentials.json");
            if let Ok(creds_content) = std::fs::read_to_string(&creds_path) {
                if let Ok(creds) = serde_json::from_str::<serde_json::Value>(&creds_content) {
                    if let Some(token) = creds.get("claudeAiOauth").and_then(|o| o.get("accessToken")).and_then(|t| t.as_str()) {
                        let client = reqwest::Client::new();
                        match client.get("https://api.anthropic.com/api/oauth/usage")
                            .header("Authorization", format!("Bearer {}", token))
                            .header("User-Agent", "claude-code/2.1.231")
                            .send().await 
                        {
                            Ok(res) => {
                                if res.status().is_success() {
                                    match res.json::<serde_json::Value>().await {
                                        Ok(api_data) => {
                                            // Try to get five_hour utilization (Current session)
                                            if let Some(five_hour) = api_data.get("five_hour") {
                                                if let Some(util) = five_hour.get("utilization").and_then(|u| u.as_f64()) {
                                                    new_util = Some(util);
                                                }
                                                if let Some(reset) = five_hour.get("resets_at").and_then(|r| r.as_str()) {
                                                    new_reset = Some(reset.to_string());
                                                }
                                            }
                                        },
                                        Err(_) => {}
                                    }
                                }
                            },
                            Err(_) => {}
                        }
                    }
                }
            }
        }

        // Apply to usage_data
        usage_data.api_used_percent = new_util.clone();
        usage_data.api_reset_at = new_reset.clone();
        if let Some(u) = new_util {
            usage_data.used_percent = u;
            usage_data.remaining_percent = (100.0 - u).max(0.0);
        }

        // Update cache regardless of success to prevent spamming on errors
        if let Ok(mut cache) = API_CACHE.lock() {
            *cache = Some((std::time::Instant::now(), new_util, new_reset));
        }
    }

    Ok(usage_data)
}

#[tauri::command]
fn close_hover_panel(app: tauri::AppHandle) {
    if let Some(hover) = app.get_webview_window("hover") {
        let _ = hover.hide();
    }
}

#[tauri::command]
fn close_click_panel(app: tauri::AppHandle) {
    if let Some(click) = app.get_webview_window("click") {
        let _ = click.hide();
    }
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    // Gracefully close all windows to try and satisfy WebView2 teardown
    for window in app.webview_windows().values() {
        let _ = window.close();
    }
    app.exit(0);
}

#[tauri::command]
fn set_tray_state(app: tauri::AppHandle, state: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let icon_bytes = match state.as_str() {
            "warning" => include_bytes!("../icons/icon_warning.ico").as_slice(),
            "critical" => include_bytes!("../icons/icon_critical.ico").as_slice(),
            "disabled" => include_bytes!("../icons/icon_disabled.ico").as_slice(),
            _ => include_bytes!("../icons/icon.ico").as_slice(),
        };
        
        if let Ok(image) = Image::from_bytes(icon_bytes) {
            let _ = tray.set_icon(Some(image));
        }
    }
}

fn position_window(window: &tauri::WebviewWindow, tray_rect: tauri::Rect) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale_factor = monitor.scale_factor();
        let window_size = window.outer_size().unwrap_or_default();
        
        let physical_pos = tray_rect.position.to_physical::<i32>(scale_factor);
        let physical_size = tray_rect.size.to_physical::<u32>(scale_factor);
        
        let tray_x = physical_pos.x;
        let tray_y = physical_pos.y;
        let tray_w = physical_size.width as i32;
        
        // Center horizontally above tray icon
        let x = tray_x + (tray_w / 2) - (window_size.width as i32 / 2);
        
        // Position vertically above tray icon (with small gap)
        let gap = 12; // pixels
        let y = tray_y - window_size.height as i32 - gap;
        
        let _ = window.set_position(Position::Physical(PhysicalPosition { x, y }));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![close_hover_panel, close_click_panel, set_tray_state, get_claude_usage, exit_app])
        .setup(|app| {
            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("BarLLM")
                .on_tray_icon_event(|tray, event| {
                    let app = tray.app_handle();
                    let hover = app.get_webview_window("hover").unwrap();
                    let click = app.get_webview_window("click").unwrap();
                    
                    match event {
                        TrayIconEvent::Enter { rect, .. } => {
                            let _ = app.emit("tray-enter", ());
                            if !click.is_visible().unwrap_or(false) {
                                position_window(&hover, rect);
                                let _ = hover.show();
                            }
                        }
                        TrayIconEvent::Leave { .. } => {
                            let _ = app.emit("tray-leave", ());
                        }
                        TrayIconEvent::Click { button, button_state, id: _, position: _, rect, .. } => {
                            if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Down {
                                let _ = hover.hide();
                                
                                if click.is_visible().unwrap_or(false) {
                                    let _ = click.hide();
                                } else {
                                    position_window(&click, rect);
                                    let _ = click.show();
                                    let _ = click.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
