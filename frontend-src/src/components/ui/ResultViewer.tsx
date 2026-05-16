import React from 'react';
import { Copy, Terminal } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function ResultViewer({ content, title = 'OUTPUT' }: { content: string; title?: string }) {
  const showToast = useAppStore((s) => s.showToast);
  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    showToast({ message: '内容已复制', type: 'success' });
  };
  return (
    <div className="w-full flex flex-col bg-[#050505] border border-white/10 rounded-xl overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono tracking-widest"><Terminal size={12} /> {title}</div>
        <button onClick={handleCopy} className="text-white/30 hover:text-white transition-colors" title="复制"><Copy size={12} /></button>
      </div>
      <div className="p-4 overflow-y-auto max-h-[400px] custom-scrollbar">
        <pre className="text-xs text-green-400/80 font-mono whitespace-pre-wrap leading-relaxed break-all">{content || 'NO DATA.'}</pre>
      </div>
    </div>
  );
}
