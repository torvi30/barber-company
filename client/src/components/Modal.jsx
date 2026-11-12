import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col transition-colors`}>
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-industrial-800 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold-500"></span>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-industrial-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-noir-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 sm:mt-4 overflow-y-auto flex-1 pr-0.5">
          {children}
        </div>
      </div>
    </div>
  );
};

