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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      {metrics.map((metric, index) => (
        <div key={index} className="flex flex-col p-3 rounded-xl bg-black/20 border border-white/5 min-w-0">
          <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-mono">{metric.label}</span>
          {metric.copyable ? (
            <button
              title={`完整 ${metric.label}: ${metric.copyable}`}
              onClick={() => handleCopy(metric.copyable!, metric.label)}
              className={`group flex items-center gap-2 text-sm text-white/90 hover:text-indigo-300 transition-colors text-left min-w-0 ${metric.isMono ? 'font-mono' : ''}`}
            >
              <span className="truncate">{metric.value}</span>
              <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ) : (
            <div className={`text-sm text-white/90 truncate ${metric.isMono ? 'font-mono' : ''}`}>{metric.value}</div>
          )}
        </div>
      ))}
    </div>
  );
}
