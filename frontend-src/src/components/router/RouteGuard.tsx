import React from "react";
import { useAppStore } from "../../store/useAppStore";
import EmptyStateGuide from "./EmptyStateGuide";

interface RouteGuardProps {
  children: React.ReactNode;
  requireProjectId?: boolean;
  requireTaskId?: boolean;
}

export default function RouteGuard({ children, requireProjectId, requireTaskId }: RouteGuardProps) {
  const { currentProjectId, currentTaskId } = useAppStore();

  if (requireProjectId && !currentProjectId) return <EmptyStateGuide type="project" />;
  if (requireTaskId && !currentTaskId) return <EmptyStateGuide type="task" />;

  return <>{children}</>;
}
