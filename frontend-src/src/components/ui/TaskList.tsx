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
  if (!items || items.length === 0) return <div className="p-8 text-center text-white/30 text-sm font-mono tracking-widest">{emptyText}</div>;
  return (
    <div className="flex flex-col gap-2 p-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-left ${item.isActive ? 'bg-indigo-500/20 border-indigo-500/50 border' : 'bg-transparent hover:bg-white/5 border border-transparent'}`}
        >
          <span className="flex flex-col min-w-0 flex-1 mr-4">
            <span className={`text-sm font-bold truncate ${item.isActive ? 'text-indigo-100' : 'text-white/80 group-hover:text-white'}`}>{item.title}</span>
            <span className="flex items-center gap-2 mt-1 min-w-0">
              {item.meta && <span className="text-[10px] text-white/40 font-mono truncate">{item.meta}</span>}
              {item.time && <span className="text-[10px] text-white/20 font-mono shrink-0">{item.time}</span>}
            </span>
          </span>
          {item.statusNode && <span className="shrink-0">{item.statusNode}</span>}
        </button>
      ))}
    </div>
  );
}
