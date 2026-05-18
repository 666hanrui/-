import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthModal from './components/AuthModal';
import RouteGuard from './components/router/RouteGuard';
import GlobalErrorBoundary from './components/router/ErrorBoundary';

import InspirationHub from './pages/InspirationHub';
import WorkflowValley from './pages/WorkflowValley';
import ProjectsPage from './pages/ProjectsPage';
import ScriptTasksPage from './pages/ScriptTasksPage';
import AssetsForge from './pages/AssetsForge';
import PromptLab from './pages/PromptLab';
import SeedancePage from './pages/SeedancePage';
import Settings from './pages/Settings';
import FramePromptLab from './pages/FramePromptLab';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<InspirationHub />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="scripts" element={<ScriptTasksPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="flow" element={<Navigate to="/projects" replace />} />

        <Route path="workflow" element={<WorkflowValley />} />

        <Route path="assets" element={
          <RouteGuard requireTaskId><AssetsForge /></RouteGuard>
        } />
        <Route path="image" element={
          <RouteGuard requireTaskId><PromptLab kind="image" /></RouteGuard>
        } />
        <Route path="video" element={
          <RouteGuard requireTaskId><PromptLab kind="video" /></RouteGuard>
        } />
        <Route path="seedance" element={
          <RouteGuard requireTaskId><SeedancePage /></RouteGuard>
        } />
        <Route path="frame-prompt" element={
          <RouteGuard requireTaskId><FramePromptLab /></RouteGuard>
        } />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <GlobalErrorBoundary>
        <AuthModal />
        <AppRoutes />
      </GlobalErrorBoundary>
    </HashRouter>
  );
}
