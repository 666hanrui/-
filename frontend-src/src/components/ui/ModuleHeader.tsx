import React from 'react';

interface ModuleHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function ModuleHeader({ eyebrow, title, subtitle, icon, actions }: ModuleHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        {icon && <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-indigo-300 shrink-0">{icon}</div>}
        <div className="min-w-0">
          {eyebrow && <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">{eyebrow}</div>}
          <h1 className="text-3xl font-bold text-white tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-white/50 mt-2 max-w-3xl leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
