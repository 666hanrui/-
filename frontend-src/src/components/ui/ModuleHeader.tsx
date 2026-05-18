import React from 'react';

interface ModuleHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function ModuleHeader({ eyebrow, title, subtitle, icon, actions }: ModuleHeaderProps) {
  void eyebrow;
  void subtitle;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        {icon && <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-indigo-300 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">{title}</h1>
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap justify-start lg:justify-end">{actions}</div>}
    </div>
  );
}
