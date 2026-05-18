import React, { forwardRef } from 'react';

interface FormFieldProps {
  label: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({ label, helperText, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-bold text-white/70 tracking-widest uppercase ml-1">
        {label}
      </label>
      {children}
      {helperText && (
        <span className="text-[10px] text-white/30 ml-1 leading-relaxed">
          {helperText}
        </span>
      )}
    </div>
  );
}

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono disabled:opacity-50 ${className}`}
        {...rest}
      />
    );
  }
);
TextInput.displayName = 'TextInput';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', rows = 3, ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-serif resize-y custom-scrollbar disabled:opacity-50 ${className}`}
        {...rest}
      />
    );
  }
);
TextArea.displayName = 'TextArea';

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ className = '', children, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans disabled:opacity-50 ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  }
);
SelectInput.displayName = 'SelectInput';

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ value, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{ backgroundColor: value ? 'var(--accent)' : undefined }}
      className={`w-14 h-8 rounded-full p-1 transition-colors focus-visible:ring-2 focus-visible:ring-white/30 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${value ? '' : 'bg-white/10'}`}
    >
      <span className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}
