import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'max-w-5xl' | 'max-w-7xl' | 'max-w-full';
}

export default function PageShell({ children, className = '', maxWidth = 'max-w-7xl' }: PageShellProps) {
  return (
    <div className={`w-full h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 ${className}`}>
      <div className={`${maxWidth} mx-auto flex flex-col gap-6`}>
        {children}
      </div>
    </div>
  );
}
