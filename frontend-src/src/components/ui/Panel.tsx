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
    <div className={`bg-[#0a0a0a]/60 border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.03)] backdrop-blur-xl ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-white/[0.02]">
          <div className="flex flex-col flex-1 min-w-0 pr-4">
            {typeof title === 'string' ? <h3 className="text-base font-bold text-white/90 tracking-wide truncate">{title}</h3> : title}
            {subtitle && <span className="text-[11px] text-white/40 mt-1 truncate">{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`flex-1 relative ${noPadding ? '' : 'p-6'}`}>{children}</div>
      {footer && <div className="px-6 py-4 border-t border-white/[0.04] bg-black/40">{footer}</div>}
    </div>
  );
}
