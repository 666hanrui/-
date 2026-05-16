import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthModal from "./components/AuthModal";
import RouteGuard from "./components/router/RouteGuard";
import InspirationHub from "./pages/InspirationHub";
import WorkflowValley from "./pages/WorkflowValley";
import ScriptTasksPage from "./pages/ScriptTasksPage";
import AssetsForge from "./pages/AssetsForge";
import PromptLab from "./pages/PromptLab";
import SeedancePage from "./pages/SeedancePage";
import ProjectsPage from "./pages/ProjectsPage";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthModal />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<InspirationHub />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="scripts" element={<ScriptTasksPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="workflow" element={<RouteGuard requireProjectId><WorkflowValley /></RouteGuard>} />
          <Route path="assets" element={<RouteGuard requireTaskId><AssetsForge /></RouteGuard>} />
          <Route path="image" element={<RouteGuard requireTaskId><PromptLab kind="image" /></RouteGuard>} />
          <Route path="video" element={<RouteGuard requireTaskId><PromptLab kind="video" /></RouteGuard>} />
          <Route path="seedance" element={<RouteGuard requireTaskId><SeedancePage /></RouteGuard>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
