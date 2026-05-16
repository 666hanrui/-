import React from 'react';

interface TaskItem {
  id: string;
  title: string;
  meta?: string;
  time?: string;
  isActive?: boolean;
  onClick?: () => void;
  statusNode?: React.ReactNode;
}

export default function TaskList({ items, emptyText = '暂无数据' }: { items: TaskItem[]; emptyText?: string }) {
  if (!items || items.length === 0) return <div className="p-8 text-center text-white/20 text-sm font-mono tracking-widest">{emptyText}</div>;

  return (
    <div className="flex flex-col gap-1.5 p-1.5 w-full">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={`group flex items-center justify-between p-3 rounded-[10px] cursor-pointer transition-all duration-200 border ${item.isActive ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[inset_0_1px_1px_rgba(99,102,241,0.1)]' : 'bg-transparent border-transparent hover:bg-white/[0.03]'}`}
        >
          <div className="flex flex-col min-w-0 flex-1 mr-3">
            <h4 className={`text-[13px] font-semibold truncate transition-colors ${item.isActive ? 'text-indigo-200' : 'text-white/70 group-hover:text-white/90'}`}>{item.title}</h4>
            {(item.meta || item.time) && (
              <div className="flex items-center gap-2 mt-1.5 min-w-0">
                {item.meta && <span className="text-[10px] text-white/30 font-mono truncate">{item.meta}</span>}
                {item.meta && item.time && <div className="w-1 h-1 rounded-full bg-white/10 shrink-0" />}
                {item.time && <span className="text-[10px] text-white/20 font-mono shrink-0">{item.time}</span>}
              </div>
            )}
          </div>
          {item.statusNode && <div className="shrink-0">{item.statusNode}</div>}
        </div>
      ))}
    </div>
  );
}
