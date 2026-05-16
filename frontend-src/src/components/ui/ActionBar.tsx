import React from 'react';
import { Loader2 } from 'lucide-react';

interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'between' | 'center';
}

export default function ActionBar({ children, className = '', align = 'left' }: ActionBarProps) {
  const alignMap = {
    left: 'justify-start',
    right: 'justify-end',
    between: 'justify-between w-full',
    center: 'justify-center',
  };
  return <div className={`flex items-center gap-3 ${alignMap[align]} ${className}`}>{children}</div>;
}

export function ActionButton({ children, variant = 'primary', size = 'md', isLoading, disabled, icon, onClick, title }: {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const baseStyle = 'flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';
  const variantMap = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/5',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white',
  };
  const sizeMap = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button onClick={onClick} disabled={disabled || isLoading} title={title} className={`${baseStyle} ${variantMap[variant]} ${sizeMap[size]}`}>
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
