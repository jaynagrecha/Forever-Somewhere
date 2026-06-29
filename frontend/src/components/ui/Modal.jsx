import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children, wide = false }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [open, title]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex min-h-full items-start justify-center py-4 md:py-8">
        <div
          ref={bodyRef}
          className={`max-h-[min(90vh,calc(100dvh-2rem))] w-full overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-card p-6 shadow-2xl animate-slide-up md:p-8 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && <h2 className="mb-6 font-display text-2xl">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}
