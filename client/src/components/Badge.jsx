import React from 'react';

export const Badge = ({ status, children }) => {
  const styles = {
    WAITING: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    IN_CHAIR: 'bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    SCHEDULED: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    AVAILABLE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40',
    IN_SERVICE: 'bg-blue-500/15 text-blue-400 border border-blue-500/40',
    BREAK: 'bg-slate-500/15 text-slate-400 border border-slate-500/40'
  };

  const currentStyle = styles[status] || 'bg-industrial-800 text-slate-300 border border-industrial-700';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full tracking-wide uppercase ${currentStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {children || status}
    </span>
  );
};

