import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'max-w-5xl' | 'max-w-7xl' | 'max-w-full';
  scroll?: boolean;
}

export default function PageShell({ children, className = '', maxWidth = 'max-w-7xl', scroll = true }: PageShellProps) {
  return (
    <div className={`w-full h-full ${scroll ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'} px-5 py-5 lg:px-7 lg:py-6 ${className}`}>
      <div className={`${maxWidth} mx-auto flex ${scroll ? 'min-h-full' : 'h-full min-h-0'} flex-col gap-5`}>
        {children}
      </div>
    </div>
  );
}
