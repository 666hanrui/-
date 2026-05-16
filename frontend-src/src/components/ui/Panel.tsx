import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Panel({ title, subtitle, actions, children, footer, className = '', noPadding = false }: PanelProps) {
  return (
    <div className={`bg-white/[0.02] border border-white/[0.05] rounded-2xl flex flex-col overflow-hidden shadow-xl backdrop-blur-md ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20">
          <div className="flex flex-col flex-1 min-w-0 pr-4">
            {typeof title === 'string' ? <h3 className="text-lg font-bold text-white tracking-wide truncate">{title}</h3> : title}
            {subtitle && <span className="text-xs text-white/40 mt-1">{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`flex-1 relative ${noPadding ? '' : 'p-6'}`}>{children}</div>
      {footer && <div className="px-6 py-4 border-t border-white/[0.05] bg-black/40">{footer}</div>}
    </div>
  );
}
