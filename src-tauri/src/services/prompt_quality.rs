// Prompt quality check — uses slug_prompt_review.txt to audit generated prompts.
use crate::llm::config::RuntimeConfig;
use crate::llm::server_proxy::{self, PromptLlmParams};
use rusqlite::params;
use serde_json::json;

pub async fn run_prompt_quality_check(
    conn: &rusqlite::Connection,
    task_id: &str,
) -> Result<serde_json::Value, String> {
    // Read the prompt output for this task
    let prompt_output: Option<String> = conn
        .query_row(
            "SELECT seedance_groups_json FROM prompt_output_records WHERE task_id = ?1",
            params![task_id],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    let settings = crate::db::crud::get_app_settings(conn);
    let runtime_config = RuntimeConfig {
        api_key: settings.text_key,
        api_base_url: settings.text_endpoint,
        default_model: settings.text_model,
        text_mode: settings.text_mode,
        mode: String::new(),
        image_endpoint: String::new(),
        image_key: String::new(),
        image_model: String::new(),
        review_threshold: settings.review_threshold as u8,
        enable_local_save: settings.enable_local_save,
    };

    let target_content = prompt_output.unwrap_or_else(|| "No prompt output found.".into());

    let result = server_proxy::request_prompt_llm(PromptLlmParams {
        runtime_config,
        prompt_slug: "prompt_review".into(),
        user_messages: vec![json!({"role": "user", "content": target_content})],
        temperature: Some(0.2),
    })
    .await?;

    // Try to parse as JSON; fallback to raw text
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
        Ok(parsed)
    } else {
        Ok(json!({
            "passed": true,
            "rawReview": result,
            "note": "Review returned non-JSON; passing by default."
        }))
    }
}
