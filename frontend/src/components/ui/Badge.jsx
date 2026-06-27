export default function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-white/10 text-white',
    gold: 'bg-gold/20 text-gold',
    accent: 'bg-accent/20 text-accent-soft',
    success: 'bg-emerald-500/20 text-emerald-200',
  };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
