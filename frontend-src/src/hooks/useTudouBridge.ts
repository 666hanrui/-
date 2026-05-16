import { useState, useCallback, useRef } from "react";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";

type Payload = Record<string, any>;
type WrapKind = "raw" | "payload" | "init" | "taskId" | "projectId" | "projectRename" | "scriptBody" | "authToken" | "authRefresh" | "doctor" | "updatePromptOutput";

interface CommandSpec {
  command: string;
  wrap?: WrapKind;
}

const COMMAND_SPECS: Record<string, CommandSpec> = {
  "auth/login": { command: "auth_login", wrap: "raw" },
  "auth/register": { command: "auth_register", wrap: "raw" },
  "auth/status": { command: "auth_status", wrap: "raw" },
  "auth/refresh": { command: "auth_refresh", wrap: "authRefresh" },
  "auth/set-token": { command: "set_auth_token", wrap: "authToken" },

  "config/get": { command: "get_app_settings", wrap: "raw" },
  "config/set": { command: "save_app_settings", wrap: "payload" },
  "config/test": { command: "test_connection", wrap: "payload" },
  "app/version": { command: "get_version", wrap: "raw" },
  "database/meta": { command: "get_database_meta", wrap: "raw" },
  "test_connection": { command: "test_connection", wrap: "payload" },
  "get_database_meta": { command: "get_database_meta", wrap: "raw" },

  "project/create": { command: "screenplay_create_project", wrap: "init" },
  "project/get-all": { command: "get_projects", wrap: "raw" },
  "project/rename": { command: "rename_project", wrap: "projectRename" },
  "project/delete": { command: "delete_project", wrap: "projectId" },

  "screenplay/skill-status": { command: "screenplay_skill_status", wrap: "raw" },
  "screenplay_skill_status": { command: "screenplay_skill_status", wrap: "raw" },
  "screenplay/list-recent": { command: "screenplay_list_recent_projects", wrap: "raw" },
  "screenplay/get": { command: "screenplay_get_project", wrap: "projectId" },
  "screenplay/rename": { command: "screenplay_rename_project", wrap: "payload" },
  "screenplay/delete": { command: "screenplay_delete_project", wrap: "projectId" },
  "screenplay/update-structured": { command: "screenplay_update_step_structured", wrap: "payload" },
  "screenplay_update_step_structured": { command: "screenplay_update_step_structured", wrap: "payload" },
  "screenplay/set-step-selection": { command: "screenplay_set_step_selection", wrap: "payload" },
  "screenplay_set_step_selection": { command: "screenplay_set_step_selection", wrap: "payload" },

  "workflow/generate": { command: "screenplay_generate_step", wrap: "payload" },
  "workflow/selfcheck": { command: "screenplay_selfcheck_step", wrap: "payload" },
  "workflow/selfcheck-cached": { command: "screenplay_get_cached_selfcheck", wrap: "payload" },
  "workflow/approve": { command: "screenplay_approve_step", wrap: "payload" },
  "workflow/rollback": { command: "screenplay_rollback_to", wrap: "payload" },
  "workflow/versions": { command: "screenplay_list_versions", wrap: "payload" },
  "workflow/restore-version": { command: "screenplay_restore_version", wrap: "payload" },
  "workflow/finalize": { command: "screenplay_finalize_to_script_task", wrap: "payload" },
  "workflow/get-checkpoint": { command: "screenplay_get_checkpoint", wrap: "payload" },
  "workflow/regenerate-checkpoint": { command: "screenplay_regenerate_checkpoint", wrap: "payload" },
  "workflow/doctor": { command: "doctor_diagnose", wrap: "doctor" },

  "script/recent": { command: "get_recent_script_tasks", wrap: "raw" },
  "script/load": { command: "load_script_task", wrap: "taskId" },
  "script/delete": { command: "delete_script_task", wrap: "taskId" },
  "script/save-draft": { command: "save_script_draft", wrap: "payload" },
  "script/generate": { command: "save_script_generation", wrap: "payload" },
  "script/import": { command: "import_existing_script", wrap: "payload" },
  "script/update-body": { command: "update_script_body", wrap: "scriptBody" },
  "script/review": { command: "run_script_review", wrap: "payload" },

  "asset/extract": { command: "run_asset_extraction", wrap: "payload" },
  "asset/get-all": { command: "get_assets_by_task", wrap: "taskId" },
  "asset/update": { command: "update_assets", wrap: "raw" },

  "prompt/image": { command: "run_image_generation", wrap: "payload" },
  "prompt/video": { command: "run_video_generation", wrap: "payload" },
  "prompt/image-review": { command: "run_image_review", wrap: "payload" },
  "prompt/video-review": { command: "run_video_review", wrap: "payload" },
  "prompt/generate-outline": { command: "generate_outline", wrap: "payload" },
  "generate_outline": { command: "generate_outline", wrap: "payload" },
  "prompt/confirm-outline": { command: "confirm_outline", wrap: "payload" },
  "confirm_outline": { command: "confirm_outline", wrap: "payload" },
  "prompt/get-outline": { command: "get_outline", wrap: "taskId" },
  "prompt/run-generation": { command: "run_prompt_generation", wrap: "payload" },
  "run_prompt_generation": { command: "run_prompt_generation", wrap: "payload" },
  "prompt/run-group-generation": { command: "run_prompt_group_generation", wrap: "payload" },
  "run_prompt_group_generation": { command: "run_prompt_group_generation", wrap: "payload" },
  "prompt/get-output": { command: "get_prompt_output_by_task", wrap: "taskId" },
  "get_prompt_output_by_task": { command: "get_prompt_output_by_task", wrap: "taskId" },
  "prompt/update-output": { command: "update_prompt_output", wrap: "updatePromptOutput" },
  "prompt/get-scene-count": { command: "get_scene_count", wrap: "taskId" },
  "get_scene_count": { command: "get_scene_count", wrap: "taskId" },
  "prompt/get-segment-titles": { command: "get_segment_titles", wrap: "taskId" },
  "get_segment_titles": { command: "get_segment_titles", wrap: "taskId" },
  "prompt/quality-check": { command: "run_prompt_quality_check", wrap: "taskId" },
  "run_prompt_quality_check": { command: "run_prompt_quality_check", wrap: "taskId" },
  "image/recent": { command: "get_recent_image_tasks", wrap: "raw" },
  "video/recent": { command: "get_recent_video_tasks", wrap: "raw" },

  "seedance/phase-ad": { command: "seedance_run_phase_ad", wrap: "payload" },
  "seedance/get-analysis": { command: "seedance_get_analysis", wrap: "payload" },
  "seedance/list-units": { command: "seedance_list_units", wrap: "payload" },
  "seedance/get-unit": { command: "seedance_get_unit", wrap: "payload" },
  "seedance/run-unit": { command: "seedance_run_unit", wrap: "payload" },
  "seedance/run-all": { command: "seedance_run_all", wrap: "payload" },
};

function pick(payload: Payload, camel: string, snake?: string) {
  return payload[camel] ?? (snake ? payload[snake] : undefined);
}

function toBackendPayload(payload: Payload) {
  const next = { ...payload };
  const pairs: Array<[string, string]> = [
    ["taskId", "task_id"],
    ["projectId", "project_id"],
    ["newBody", "new_body"],
    ["newName", "new_name"],
    ["refreshToken", "refresh_token"],
    ["seedanceGroups", "seedance_groups"],
    ["unitIndex", "unit_index"],
  ];
  for (const [camel, snake] of pairs) {
    if (next[camel] !== undefined && next[snake] === undefined) next[snake] = next[camel];
    if (next[snake] !== undefined && next[camel] === undefined) next[camel] = next[snake];
  }
  return next;
}

function wrapArgs(kind: WrapKind = "raw", payload: Payload = {}) {
  const p = toBackendPayload(payload);
  switch (kind) {
    case "payload":
      return { payload: p };
    case "init":
      return { init: p };
    case "taskId":
      return { taskId: pick(p, "taskId", "task_id") || "" };
    case "projectId":
      return { projectId: pick(p, "projectId", "project_id") || "" };
    case "projectRename":
      return {
        projectId: pick(p, "projectId", "project_id") || "",
        newName: pick(p, "newName", "new_name") || "",
      };
    case "scriptBody":
      return {
        taskId: pick(p, "taskId", "task_id") || "",
        newBody: pick(p, "newBody", "new_body") || "",
      };
    case "authToken":
      return {
        token: p.token || "",
        refreshToken: pick(p, "refreshToken", "refresh_token") || "",
      };
    case "authRefresh":
      return { refreshToken: pick(p, "refreshToken", "refresh_token") || "" };
    case "doctor":
      return {
        question: p.question || "",
        projectId: pick(p, "projectId", "project_id") || "",
      };
    case "updatePromptOutput":
      return {
        taskId: pick(p, "taskId", "task_id") || "",
        seedanceGroups: pick(p, "seedanceGroups", "seedance_groups") || "",
      };
    default:
      return p;
  }
}

function resolveSpec(action: string): CommandSpec {
  return COMMAND_SPECS[action] || { command: action, wrap: "raw" };
}

function isTauriRuntime() {
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

export const useTudouBridge = () => {
  const [isLoading, setIsLoading] = useState(false);
  const activeRequests = useRef(new Map<string, Promise<any>>());

  const invoke = useCallback(
    async <T = any>(
      action: string,
      payload: Payload = {},
      options: { timeout?: number; silent?: boolean } = { timeout: 30000, silent: false }
    ): Promise<T> => {
      const spec = resolveSpec(action);
      const backendCommand = spec.command;
      const backendArgs = wrapArgs(spec.wrap, payload);
      const reqId = `${backendCommand}-${JSON.stringify(backendArgs)}`;
      const effectiveTimeout = options.timeout ?? (backendCommand === "screenplay_get_project" ? 120000 : 30000);

      const existing = activeRequests.current.get(reqId);
      if (existing) return existing as Promise<T>;
      if (!options.silent) setIsLoading(true);

      const request = (async () => {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`[IPC Timeout] Command ${backendCommand} 无响应`)), effectiveTimeout)
          );

          const fetchPromise = (async () => {
            if (!isTauriRuntime()) {
              console.warn(`[Mock IPC] ${backendCommand}`, backendArgs);
              if (backendCommand === "auth_status") return { loggedIn: false } as any;
              if (backendCommand === "auth_login") return { token: "mock", username: payload.username } as any;
              if (backendCommand === "get_recent_script_tasks") return [] as any;
              if (backendCommand === "load_script_task") return { task: payload, outputs: [] } as any;
              if (backendCommand === "get_projects") return [] as any;
              if (backendCommand === "screenplay_list_recent_projects") return [] as any;
              if (backendCommand === "screenplay_create_project") return { projectId: "mock-uid-001" } as any;
              return { success: true } as any;
            }
            const res = await tauriInvoke<T>(backendCommand, backendArgs);
            if (res && typeof res === "object" && "error" in (res as any) && (res as any).error) throw new Error((res as any).error);
            return res as T;
          })();

          return await Promise.race([fetchPromise, timeoutPromise]);
        } finally {
          activeRequests.current.delete(reqId);
          if (!options.silent) setIsLoading(false);
        }
      })();

      activeRequests.current.set(reqId, request);
      return request;
    },
    []
  );

  return { invoke, isLoading };
};
