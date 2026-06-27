const variants = {
  primary:
    'bg-gradient-to-r from-accent to-accent-soft text-white shadow-lg shadow-accent/25 hover:brightness-110',
  secondary: 'bg-white/10 text-white hover:bg-white/15 border border-white/10',
  ghost: 'bg-transparent text-white/80 hover:text-white hover:bg-white/5',
  danger: 'bg-red-900/40 text-red-100 hover:bg-red-900/60 border border-red-500/20',
};

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-full',
};

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
