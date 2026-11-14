import React from 'react';

export const StatCard = ({ title, value, change, icon: Icon, highlight = false, subtitle, compact = false }) => {
  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      compact ? 'p-2.5 sm:p-4' : 'p-3.5 sm:p-5'
    } ${
      highlight
        ? 'bg-amber-50/90 dark:bg-gold-500/10 border-amber-400/50 dark:border-gold-500/40 shadow-sm dark:shadow-glow-gold'
        : 'bg-white dark:bg-noir-900/90 border-slate-200 dark:border-industrial-800 hover:border-amber-400/40 dark:hover:border-gold-500/40 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate mr-1 ${
          highlight ? 'text-amber-800 dark:text-gold-300' : 'text-slate-500 dark:text-industrial-400'
        }`}>
          {title}
        </span>
        {Icon && (
          <div className={`p-1 sm:p-1.5 rounded-lg flex-shrink-0 ${
            highlight
              ? 'bg-amber-500/20 text-amber-600 dark:text-gold-400'
              : 'bg-slate-100 dark:bg-noir-800 text-slate-500 dark:text-industrial-400'
          }`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <div className={`text-base sm:text-xl lg:text-2xl font-bold tracking-tight font-display truncate ${
          highlight ? 'text-amber-950 dark:text-white' : 'text-slate-900 dark:text-white'
        }`}>
          {value}
        </div>
        {change && (
          <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className={`mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] leading-tight truncate ${
          highlight ? 'text-amber-700/80 dark:text-industrial-400' : 'text-slate-500 dark:text-industrial-400'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

