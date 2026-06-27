export default function Card({ children, className = '', highlight = false, ...props }) {
  return (
    <div
      className={`rounded-3xl border p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 md:p-8 ${
        highlight
          ? 'border-gold/30 bg-gradient-to-br from-[#2a1f08] to-[#3b2f10]'
          : 'border-white/5 bg-gradient-to-br from-card to-card-hover hover:border-white/10'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
