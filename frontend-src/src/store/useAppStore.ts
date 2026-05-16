import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

export type RealmType = "cloudcity" | "valley" | "samurai";

export interface UserProfile {
  username: string;
  token: string;
}

export type ToastPayload =
  | string
  | {
      message: string;
      type?: "success" | "error" | "info";
    };

export interface GlobalError {
  title: string;
  details: string;
  action: string;
  suggestion: string;
}

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  currentRealm: RealmType;
  setRealm: (realm: RealmType) => void;

  scriptSeed: string;
  setScriptSeed: (seed: string) => void;

  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;

  currentTaskId: string | null;
  setCurrentTaskId: (id: string | null) => void;

  currentStep: number;
  setCurrentStep: (step: number) => void;

  isDoctorPanelOpen: boolean;
  setDoctorPanelOpen: (isOpen: boolean) => void;

  toast: ToastPayload | null;
  showToast: (toast: ToastPayload) => void;
  clearToast: () => void;

  language: "zh" | "en";
  setLanguage: (lang: "zh" | "en") => void;

  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;

  globalError: GlobalError | null;
  setGlobalError: (error: GlobalError | null) => void;
  clearError: () => void;

  validateAndCleanIds: (backendExists: boolean, type: "project" | "task") => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }, false, "auth/setUser"),

        currentRealm: "cloudcity",
        setRealm: (currentRealm) => set({ currentRealm }, false, "ui/setRealm"),

        scriptSeed: "",
        setScriptSeed: (scriptSeed) => set({ scriptSeed }, false, "script/setSeed"),

        currentProjectId: null,
        setCurrentProjectId: (currentProjectId) =>
          set({ currentProjectId }, false, "script/setProjectId"),

        currentTaskId: null,
        setCurrentTaskId: (currentTaskId) =>
          set({ currentTaskId }, false, "script/setTaskId"),

        currentStep: 0,
        setCurrentStep: (currentStep) =>
          set({ currentStep }, false, "script/setStep"),

        isDoctorPanelOpen: false,
        setDoctorPanelOpen: (isDoctorPanelOpen) => set({ isDoctorPanelOpen }),

        toast: null,
        showToast: (toast) => set({ toast }, false, "ui/showToast"),
        clearToast: () => set({ toast: null }, false, "ui/clearToast"),

        language: "zh",
        setLanguage: (language) => set({ language }, false, "ui/setLanguage"),

        theme: "dark",
        setTheme: (theme) => set({ theme }, false, "ui/setTheme"),

        globalError: null,
        setGlobalError: (globalError) => set({ globalError }, false, "ui/setGlobalError"),
        clearError: () => set({ globalError: null }, false, "ui/clearError"),

        validateAndCleanIds: (backendExists, type) => {
          if (backendExists) return;
          if (type === "project") set({ currentProjectId: null }, false, "script/cleanProjectId");
          if (type === "task") set({ currentTaskId: null }, false, "script/cleanTaskId");
        },
      }),
      {
        name: "scriptstack-core-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          language: state.language,
          theme: state.theme,
          currentRealm: state.currentRealm,
          scriptSeed: state.scriptSeed,
          currentProjectId: state.currentProjectId,
          currentTaskId: state.currentTaskId,
          currentStep: state.currentStep,
        }),
      }
    ),
    { name: "ScriptStack_Store" }
  )
);
