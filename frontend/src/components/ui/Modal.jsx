import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-card p-6 shadow-2xl animate-slide-up md:p-8 ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-6 font-display text-2xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
