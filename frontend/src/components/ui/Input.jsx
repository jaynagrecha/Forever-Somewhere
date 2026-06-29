export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm text-muted">{label}</span>}
      <input
        className={`mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function TextArea({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm text-muted">{label}</span>}
      <textarea
        className={`mt-2 min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm text-muted">{label}</span>}
      <select
        className={`form-select mt-2 w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-white outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
