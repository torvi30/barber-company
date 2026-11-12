import React from 'react';

export const StatCard = ({ title, value, change, icon: Icon, highlight = false, subtitle }) => {
  return (
    <div className={`p-4 md:p-5 rounded-2xl border transition-all duration-300 ${
      highlight
        ? 'bg-amber-50/90 dark:bg-gold-500/10 border-amber-400/50 dark:border-gold-500/40 shadow-sm dark:shadow-glow-gold'
        : 'bg-white dark:bg-noir-900/90 border-slate-200 dark:border-industrial-800 hover:border-amber-400/40 dark:hover:border-gold-500/40 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${
          highlight ? 'text-amber-800 dark:text-gold-300' : 'text-slate-500 dark:text-industrial-400'
        }`}>
          {title}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${
            highlight
              ? 'bg-amber-500/20 text-amber-600 dark:text-gold-400'
              : 'bg-slate-100 dark:bg-noir-800 text-slate-500 dark:text-industrial-400'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className={`text-xl md:text-2xl font-bold tracking-tight font-display ${
          highlight ? 'text-amber-950 dark:text-white' : 'text-slate-900 dark:text-white'
        }`}>
          {value}
        </div>
        {change && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className={`mt-1 text-[11px] leading-tight ${
          highlight ? 'text-amber-700/80 dark:text-industrial-400' : 'text-slate-500 dark:text-industrial-400'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

