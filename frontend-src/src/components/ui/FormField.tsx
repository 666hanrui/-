import React from 'react';

interface FormFieldProps {
  label: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({ label, helperText, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-bold text-white/70 tracking-widest uppercase ml-1">{label}</label>
      {children}
      {helperText && <span className="text-[10px] text-white/30 ml-1 leading-relaxed">{helperText}</span>}
    </div>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, any>(function TextInput(
  { value, onChange, placeholder, type = 'text', disabled, ...rest },
  ref
) {
  return (
    <input
      {...rest}
      ref={ref}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono disabled:opacity-50"
    />
  );
});

export const TextArea = React.forwardRef<HTMLTextAreaElement, any>(function TextArea(
  { value, onChange, placeholder, disabled, rows = 4, ...rest },
  ref
) {
  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-serif resize-y custom-scrollbar disabled:opacity-50"
    />
  );
});
