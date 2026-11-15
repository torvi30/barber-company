import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', minHeight = '' }) => {
  useEffect(() => {
    if (!isOpen) return;

    // Bloquear el scroll de fondo mientras el modal esté abierto
    const originalOverflow = document?.body ? document.body.style.overflow : '';
    if (document?.body) document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (document?.body) document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const modalContent = (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} ${minHeight} bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-6 text-slate-900 dark:text-slate-100 max-h-[92dvh] sm:max-h-[88vh] flex flex-col transition-all duration-200 cursor-default my-auto`}
      >
        {/* Cabecera del Modal con Botón X de alta respuesta */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-industrial-800 flex-shrink-0">
          <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-gold-500 flex-shrink-0 shadow-glow-gold"></span>
            <span className="truncate">{title}</span>
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClose) onClose();
            }}
            aria-label="Cerrar ventana"
            className="p-2 rounded-xl text-slate-400 dark:text-industrial-400 hover:bg-slate-100 dark:hover:bg-noir-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll independiente garantizado */}
        <div className="mt-3 overflow-y-auto flex-1 pr-1 pb-4 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );

  return (typeof document !== 'undefined' && document.body)
    ? createPortal(modalContent, document.body)
    : modalContent;
};


