import React from 'react';
import { Copy } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface Metric {
  label: string;
  value: React.ReactNode;
  copyable?: string;
  isMono?: boolean;
}

export default function ContextMetricGrid({ metrics }: { metrics: Metric[] }) {
  const showToast = useAppStore((s) => s.showToast);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({ message: `${label} 已复制`, type: 'success' });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
      {metrics.map((m, idx) => (
        <div key={idx} className="flex flex-col p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] min-w-0">
          <span className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-semibold truncate">{m.label}</span>
          {m.copyable ? (
            <div
              title={`完整 ${m.label}:\n${m.copyable}\n点击复制`}
              onClick={() => handleCopy(m.copyable!, m.label)}
              className={`group flex items-center gap-1.5 text-sm text-white/80 cursor-pointer hover:text-indigo-300 transition-colors min-w-0 ${m.isMono ? 'font-mono' : ''}`}
            >
              <span className="truncate">{m.value}</span>
              <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-indigo-400/50" />
            </div>
          ) : (
            <div className={`text-sm text-white/80 truncate ${m.isMono ? 'font-mono' : ''}`}>{m.value}</div>
          )}
        </div>
      ))}
    </div>
  );
}
