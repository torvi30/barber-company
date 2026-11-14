import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-3.5 sm:p-6 text-slate-900 dark:text-slate-100 max-h-[calc(100dvh-2.5rem)] flex flex-col transition-colors`}>
        <div className="flex items-center justify-between pb-2.5 sm:pb-4 border-b border-slate-100 dark:border-industrial-800 flex-shrink-0">
          <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-gold-500 flex-shrink-0"></span>
            <span className="truncate">{title}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-industrial-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-noir-800 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2.5 sm:mt-4 overflow-y-auto flex-1 pr-1 pb-3 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

