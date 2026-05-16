use rusqlite::{params, Connection};
use serde_json::json;
use uuid::Uuid;

use crate::llm::config::RuntimeConfig;
use crate::llm::server_proxy::{self, PromptLlmParams};

fn now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

fn uuid() -> String {
    Uuid::new_v4().to_string()
}

fn array_from_text(text: &str) -> Option<Vec<serde_json::Value>> {
    let text = text.trim();
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(text) {
        if let Some(arr) = v.as_array() {
            return Some(arr.clone());
        }
        if let Some(obj) = v.as_object() {
            for val in obj.values() {
                if let Some(arr) = val.as_array() {
                    if !arr.is_empty() {
                        return Some(arr.clone());
                    }
                }
            }
        }
    }
    let start = text.find('[')?;
    let end = text.rfind(']')?;
    serde_json::from_str::<Vec<serde_json::Value>>(&text[start..=end]).ok()
}

fn parse_asset_list(raw: &str, label: &str) -> Result<Vec<serde_json::Value>, String> {
    if raw.trim().is_empty() {
        return Ok(vec![]);
    }
    serde_json::from_str::<Vec<serde_json::Value>>(raw)
        .map_err(|e| format!("{} JSON 解析失败: {}", label, e))
}

fn normalize_character(raw: &serde_json::Value) -> serde_json::Value {
    json!({
        "id": raw.get("id").and_then(|v| v.as_str()).map(String::from).unwrap_or_else(uuid),
        "name": raw.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown"),
        "role": raw.get("role").and_then(|v| v.as_str()).unwrap_or("Unknown"),
        "aliases": raw.get("aliases").cloned().unwrap_or_else(|| json!([])),
        "appearance": raw.get("appearance").and_then(|v| v.as_str()).unwrap_or(""),
        "clothing": raw.get("clothing").and_then(|v| v.as_str()).unwrap_or(""),
        "personality": raw.get("personality").and_then(|v| v.as_str()).unwrap_or(""),
        "colorPalette": raw.get("colorPalette").and_then(|v| v.as_str()).unwrap_or(""),
        "visualAnchor": raw.get("visualAnchor").and_then(|v| v.as_str()).unwrap_or(""),
        "aiPrompt": raw.get("aiPrompt").and_then(|v| v.as_str()).unwrap_or(""),
    })
}

fn normalize_scene(raw: &serde_json::Value) -> serde_json::Value {
    json!({
        "id": raw.get("id").and_then(|v| v.as_str()).map(String::from).unwrap_or_else(uuid),
        "name": raw.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown"),
        "aliases": raw.get("aliases").cloned().unwrap_or_else(|| json!([])),
        "timeOfDay": raw.get("timeOfDay").and_then(|v| v.as_str()).unwrap_or(""),
        "atmosphere": raw.get("atmosphere").and_then(|v| v.as_str()).unwrap_or(""),
        "materials": raw.get("materials").and_then(|v| v.as_str()).unwrap_or(""),
        "landmarks": raw.get("landmarks").and_then(|v| v.as_str()).unwrap_or(""),
        "colorTemperature": raw.get("colorTemperature").and_then(|v| v.as_str()).unwrap_or(""),
        "visualAnchor": raw.get("visualAnchor").and_then(|v| v.as_str()).unwrap_or(""),
        "aiPrompt": raw.get("aiPrompt").and_then(|v| v.as_str()).unwrap_or(""),
    })
}

fn normalize_prop(raw: &serde_json::Value) -> serde_json::Value {
    json!({
        "id": raw.get("id").and_then(|v| v.as_str()).map(String::from).unwrap_or_else(uuid),
        "name": raw.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown"),
        "aliases": raw.get("aliases").cloned().unwrap_or_else(|| json!([])),
        "dramaticFunction": raw.get("dramaticFunction").and_then(|v| v.as_str()).unwrap_or(""),
        "form": raw.get("form").and_then(|v| v.as_str()).unwrap_or(""),
        "material": raw.get("material").and_then(|v| v.as_str()).unwrap_or(""),
        "surfaceState": raw.get("surfaceState").and_then(|v| v.as_str()).unwrap_or(""),
        "visualAnchor": raw.get("visualAnchor").and_then(|v| v.as_str()).unwrap_or(""),
        "aiPrompt": raw.get("aiPrompt").and_then(|v| v.as_str()).unwrap_or(""),
    })
}

fn fallback_characters(text: &str) -> Vec<serde_json::Value> {
    let re = regex_lite::Regex::new(r"\*\*(.{1,8})\*\*(?:\s*(?:（[^）]*）))?\s*[：:]").unwrap();
    let mut out = vec![];
    let mut seen = std::collections::HashSet::new();
    for cap in re.captures_iter(text) {
        let name = cap.get(1).map(|m| m.as_str().trim()).unwrap_or("");
        if name.is_empty() || name.starts_with("场景") || name.starts_with("出场") || seen.contains(name) {
            continue;
        }
        seen.insert(name.to_string());
        out.push(json!({"id": uuid(), "name": name, "role": "", "aliases": [], "appearance": "", "clothing": "", "personality": "", "colorPalette": "", "visualAnchor": "", "aiPrompt": ""}));
    }
    out
}

fn fallback_scenes(text: &str) -> Vec<serde_json::Value> {
    let re = regex_lite::Regex::new(r"\*\*场景[：:]\*\*\s*([^\n]+)").unwrap();
    let mut out = vec![];
    let mut seen = std::collections::HashSet::new();
    for cap in re.captures_iter(text) {
        let name = cap.get(1).map(|m| m.as_str().trim()).unwrap_or("");
        if name.is_empty() || seen.contains(name) {
            continue;
        }
        seen.insert(name.to_string());
        out.push(json!({"id": uuid(), "name": name, "aliases": [], "timeOfDay": "", "atmosphere": "", "materials": "", "landmarks": "", "colorTemperature": "", "visualAnchor": "", "aiPrompt": ""}));
    }
    out
}

fn fallback_props(_text: &str) -> Vec<serde_json::Value> {
    vec![]
}

fn persist_assets(conn: &Connection, task_id: &str, characters: &[serde_json::Value], scenes: &[serde_json::Value], props: &[serde_json::Value], time: &str) -> Result<(), String> {
    conn.execute("DELETE FROM asset_records WHERE task_id = ?1", params![task_id])
        .map_err(|e| format!("清理旧资产失败: {}", e))?;
    for item in characters {
        conn.execute("INSERT INTO asset_records (id, task_id, asset_type, asset_data_json, created_at) VALUES (?1, ?2, 'character', ?3, ?4)", params![uuid(), task_id, item.to_string(), time])
            .map_err(|e| format!("写入角色资产失败: {}", e))?;
    }
    for item in scenes {
        conn.execute("INSERT INTO asset_records (id, task_id, asset_type, asset_data_json, created_at) VALUES (?1, ?2, 'scene', ?3, ?4)", params![uuid(), task_id, item.to_string(), time])
            .map_err(|e| format!("写入场景资产失败: {}", e))?;
    }
    for item in props {
        conn.execute("INSERT INTO asset_records (id, task_id, asset_type, asset_data_json, created_at) VALUES (?1, ?2, 'prop', ?3, ?4)", params![uuid(), task_id, item.to_string(), time])
            .map_err(|e| format!("写入道具资产失败: {}", e))?;
    }
    Ok(())
}

async fn extract_with_prompt(runtime_config: &RuntimeConfig, slug: &str, script_body: &str) -> Option<Vec<serde_json::Value>> {
    for _ in 0..2 {
        let result = server_proxy::request_prompt_llm(PromptLlmParams {
            runtime_config: runtime_config.clone(),
            prompt_slug: slug.to_string(),
            temperature: Some(0.2),
            user_messages: vec![json!({"role": "user", "content": script_body})],
        }).await;
        if let Ok(text) = result {
            if let Some(arr) = array_from_text(&text) {
                if !arr.is_empty() {
                    return Some(arr);
                }
            }
        }
    }
    None
}

fn load_script_body(conn: &Connection, task_id: &str) -> Result<String, String> {
    let row: Result<Option<String>, _> = conn.query_row(
        "SELECT script_body FROM script_outputs WHERE task_id = ?1 ORDER BY created_at DESC LIMIT 1",
        params![task_id],
        |row| row.get(0),
    );
    match row {
        Ok(Some(body)) if !body.trim().is_empty() => Ok(body),
        _ => {
            let task_exists: bool = conn.query_row("SELECT 1 FROM script_tasks WHERE id = ?1", params![task_id], |_| Ok(true)).unwrap_or(false);
            if task_exists {
                Err("当前剧本任务还没有正文内容。请先在剧本阶段生成剧本，或使用「导入已有剧本」功能上传剧本后再继续。".into())
            } else {
                Err("找不到该任务，请重新选择或重新创建剧本任务。".into())
            }
        }
    }
}

fn db_path(conn: &Connection) -> Result<String, String> {
    conn.query_row("PRAGMA database_list", [], |row| row.get::<_, String>(2))
        .map_err(|e| format!("读取数据库路径失败: {}", e))
}

struct PreparedExtraction {
    task_id: String,
    time: String,
    db_path: String,
    runtime_config: RuntimeConfig,
    script_body: String,
}

fn prepare(conn: &Connection, task_id: &str) -> Result<PreparedExtraction, String> {
    let settings = crate::db::crud::get_app_settings(conn);
    if settings.text_key.trim().is_empty() || settings.text_endpoint.trim().is_empty() {
        return Err("API 未配置，无法调用资产提取提示词。请先在设置页配置文字模型。".into());
    }
    Ok(PreparedExtraction {
        task_id: task_id.to_string(),
        time: now(),
        db_path: db_path(conn)?,
        script_body: load_script_body(conn, task_id)?,
        runtime_config: RuntimeConfig {
            api_key: settings.text_key,
            api_base_url: settings.text_endpoint,
            default_model: settings.text_model,
            text_mode: settings.text_mode,
            mode: "local-configured".into(),
            image_endpoint: String::new(),
            image_key: String::new(),
            image_model: String::new(),
            review_threshold: settings.review_threshold as u8,
            enable_local_save: settings.enable_local_save,
        },
    })
}

pub fn run_asset_extraction(conn: &Connection, task_id: &str) -> impl std::future::Future<Output = Result<serde_json::Value, String>> + Send + 'static {
    let prepared = prepare(conn, task_id);
    async move {
        let p = prepared?;
        let mut fallback_used = false;

        let characters = match extract_with_prompt(&p.runtime_config, "asset_character", &p.script_body).await {
            Some(items) => items.iter().map(normalize_character).collect(),
            None => {
                let items = fallback_characters(&p.script_body);
                if !items.is_empty() { fallback_used = true; }
                items
            }
        };
        let scenes = match extract_with_prompt(&p.runtime_config, "asset_scene", &p.script_body).await {
            Some(items) => items.iter().map(normalize_scene).collect(),
            None => {
                let items = fallback_scenes(&p.script_body);
                if !items.is_empty() { fallback_used = true; }
                items
            }
        };
        let props = match extract_with_prompt(&p.runtime_config, "asset_prop", &p.script_body).await {
            Some(items) => items.iter().map(normalize_prop).collect(),
            None => fallback_props(&p.script_body),
        };

        let write_conn = Connection::open(&p.db_path).map_err(|e| format!("打开数据库写入资产失败: {}", e))?;
        persist_assets(&write_conn, &p.task_id, &characters, &scenes, &props, &p.time)?;

        let extraction_model = if fallback_used {
            format!("local-asset-extractor-v2 / {} / regex-fallback", p.runtime_config.default_model)
        } else {
            format!("local-asset-extractor-v2 / {}", p.runtime_config.default_model)
        };

        Ok(json!({
            "taskId": p.task_id,
            "characters": characters,
            "scenes": scenes,
            "props": props,
            "extractedAt": p.time,
            "extractionModel": extraction_model,
            "fallbackUsed": fallback_used,
            "promptSlugs": ["asset_character", "asset_scene", "asset_prop"]
        }))
    }
}

pub fn update_assets(conn: &Connection, task_id: &str, characters: &str, scenes: &str, props: &str) -> Result<serde_json::Value, String> {
    let time = now();
    let characters = parse_asset_list(characters, "characters")?.iter().map(normalize_character).collect::<Vec<_>>();
    let scenes = parse_asset_list(scenes, "scenes")?.iter().map(normalize_scene).collect::<Vec<_>>();
    let props = parse_asset_list(props, "props")?.iter().map(normalize_prop).collect::<Vec<_>>();
    persist_assets(conn, task_id, &characters, &scenes, &props, &time)?;
    Ok(json!({"taskId": task_id, "characters": characters, "scenes": scenes, "props": props, "savedAt": time}))
}
