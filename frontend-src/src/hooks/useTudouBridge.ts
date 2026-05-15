import { useState, useCallback, useRef } from "react";

const ACTION_MAP: Record<string, string> = {
  "auth/login": "auth_login",
  "auth/register": "auth_register",
  "auth/status": "auth_status",
  "config/get": "get_app_settings",
  "config/set": "save_app_settings",
  "project/create": "screenplay_create_project",
  "workflow/generate": "screenplay_generate_step",
  "workflow/doctor": "doctor_diagnose",
  "asset/extract": "run_asset_extraction",
  "asset/get-all": "get_assets_by_task",
  "prompt/image": "run_image_generation",
  "prompt/video": "run_video_generation",
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
