import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Panel({ title, subtitle, actions, children, footer, className = '', noPadding = false }: PanelProps) {
  return (
    <div className={`min-h-0 bg-[#080808]/82 border border-white/[0.07] rounded-xl flex flex-col overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.24),inset_0_1px_1px_rgba(255,255,255,0.03)] backdrop-blur-md ${className}`}>
      {(title || actions) && (
        <div className="shrink-0 flex flex-col gap-3 px-5 py-4 border-b border-white/[0.05] bg-white/[0.025] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col flex-1 min-w-0 pr-4">
            {typeof title === 'string' ? <h3 className="text-base font-bold text-white/90 tracking-wide leading-snug">{title}</h3> : title}
            {subtitle && <span className="text-[11px] text-white/42 mt-1 leading-relaxed">{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className={`min-h-0 flex-1 relative ${noPadding ? '' : 'p-5'}`}>{children}</div>
      {footer && <div className="shrink-0 px-6 py-4 border-t border-white/[0.04] bg-black/40">{footer}</div>}
    </div>
  );
}
