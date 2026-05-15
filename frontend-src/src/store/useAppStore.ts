import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

export type RealmType = "cloudcity" | "valley" | "samurai";

export interface UserProfile {
  username: string;
  token: string;
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

  toast: string;
  showToast: (message: string) => void;
  clearToast: () => void;
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

        toast: "",
        showToast: (toast) => set({ toast }, false, "ui/showToast"),
        clearToast: () => set({ toast: "" }, false, "ui/clearToast"),
      }),
      {
        name: "scriptstack-core-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          scriptSeed: state.scriptSeed,
          currentProjectId: state.currentProjectId,
          currentTaskId: state.currentTaskId,
        }),
      }
    ),
    { name: "ScriptStack_Store" }
  )
);
