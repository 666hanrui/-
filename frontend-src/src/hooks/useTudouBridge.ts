import { useState, useCallback, useRef } from "react";

const ACTION_MAP: Record<string, string> = {
  "auth/login": "auth_login",
  "auth/register": "auth_register",
  "auth/status": "auth_status",
  "config/get": "get_app_settings",
  "config/set": "save_app_settings",
  "project/create": "screenplay_create_project",
  "project/get-all": "get_projects",
  "project/rename": "rename_project",
  "project/delete": "delete_project",
  "screenplay/list-recent": "screenplay_list_recent_projects",
  "screenplay/get": "screenplay_get_project",
  "screenplay/rename": "screenplay_rename_project",
  "screenplay/delete": "screenplay_delete_project",
  "workflow/generate": "screenplay_generate_step",
  "workflow/selfcheck": "screenplay_selfcheck_step",
  "workflow/selfcheck-cached": "screenplay_get_cached_selfcheck",
  "workflow/approve": "screenplay_approve_step",
  "workflow/rollback": "screenplay_rollback_to",
  "workflow/versions": "screenplay_list_versions",
  "workflow/restore-version": "screenplay_restore_version",
  "workflow/finalize": "screenplay_finalize_to_script_task",
  "workflow/get-checkpoint": "screenplay_get_checkpoint",
  "workflow/regenerate-checkpoint": "screenplay_regenerate_checkpoint",
  "workflow/doctor": "doctor_diagnose",
  "script/recent": "get_recent_script_tasks",
  "script/load": "load_script_task",
  "script/delete": "delete_script_task",
  "script/save-draft": "save_script_draft",
  "script/generate": "save_script_generation",
  "script/import": "import_existing_script",
  "script/update-body": "update_script_body",
  "script/review": "run_script_review",
  "asset/extract": "run_asset_extraction",
  "asset/get-all": "get_assets_by_task",
  "asset/update": "update_assets",
  "prompt/image": "run_image_generation",
  "prompt/video": "run_video_generation",
  "prompt/image-review": "run_image_review",
  "prompt/video-review": "run_video_review",
  "image/recent": "get_recent_image_tasks",
  "video/recent": "get_recent_video_tasks",
  "seedance/phase-ad": "seedance_run_phase_ad",
  "seedance/get-analysis": "seedance_get_analysis",
  "seedance/list-units": "seedance_list_units",
  "seedance/get-unit": "seedance_get_unit",
  "seedance/run-unit": "seedance_run_unit",
  "seedance/run-all": "seedance_run_all",
};

export const useTudouBridge = () => {
  const [isLoading, setIsLoading] = useState(false);
  const activeRequests = useRef(new Set<string>());

  const invoke = useCallback(
    async <T = any>(
      action: string,
      payload: Record<string, any> = {},
      options: { timeout?: number; silent?: boolean } = {
        timeout: 30000,
        silent: false,
      }
    ): Promise<T> => {
      const backendCommand = ACTION_MAP[action] || action;
      const reqId = `${backendCommand}-${JSON.stringify(payload)}`;

      if (activeRequests.current.has(reqId))
        throw new Error("拦截高频重复请求");
      activeRequests.current.add(reqId);
      if (!options.silent) setIsLoading(true);

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`[IPC Timeout] Command ${backendCommand} 无响应`)
              ),
            options.timeout
          )
        );

        const fetchPromise = (async () => {
          const I = (window as any).__TAURI_INTERNALS__;
          if (!I) {
            console.warn(`[Mock IPC] ${backendCommand}`, payload);
            if (backendCommand === "auth_status")
              return { loggedIn: false } as any;
            if (backendCommand === "auth_login")
              return { token: "mock", username: payload.username } as any;
            if (backendCommand === "get_recent_script_tasks")
              return [] as any;
            if (backendCommand === "load_script_task")
              return { task: payload, outputs: [] } as any;
            if (backendCommand === "get_projects")
              return [] as any;
            if (backendCommand === "screenplay_list_recent_projects")
              return [] as any;
            if (backendCommand === "screenplay_create_project")
              return { projectId: "mock-uid-001" } as any;
            return { success: true } as any;
          }
          const res = await I.invoke(backendCommand, payload);
          if (res && res.error) throw new Error(res.error);
          return res as T;
        })();

        return await Promise.race([fetchPromise, timeoutPromise]);
      } finally {
        activeRequests.current.delete(reqId);
        if (!options.silent) setIsLoading(false);
      }
    },
    []
  );

  return { invoke, isLoading };
};