import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, primaryAction, secondaryAction }: EmptyStateProps) {
  return (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-black/10 border border-dashed border-white/10 rounded-2xl">
      {icon && <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-5">{icon}</div>}
      <h3 className="text-lg font-bold text-white tracking-wider mb-2">{title}</h3>
      {description && <p className="text-sm text-white/40 max-w-md leading-relaxed mb-6">{description}</p>}
      {(primaryAction || secondaryAction) && <div className="flex items-center gap-4">{primaryAction}{secondaryAction}</div>}
    </div>
  );
}
