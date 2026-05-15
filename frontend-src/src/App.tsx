import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthModal from "./components/AuthModal";
import InspirationHub from "./pages/InspirationHub";
import WorkflowValley from "./pages/WorkflowValley";
import AssetsForge from "./pages/AssetsForge";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthModal />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<InspirationHub />} />
          <Route path="workflow" element={<WorkflowValley />} />
          <Route path="assets" element={<AssetsForge />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
