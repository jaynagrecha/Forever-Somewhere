import { Link } from 'react-router-dom';

const SIZES = {
  xs: { icon: 28, text: 'text-lg' },
  sm: { icon: 36, text: 'text-xl' },
  md: { icon: 48, text: 'text-2xl md:text-3xl' },
  lg: { icon: 72, text: 'text-4xl md:text-5xl' },
  xl: { icon: 96, text: 'text-5xl md:text-7xl' },
};

export default function BrandLogo({
  size = 'md',
  showText = true,
  to,
  className = '',
  textClassName = '',
}) {
  const cfg = SIZES[size] || SIZES.md;
  const content = (
    <>
      <img
        src="/logo-icon.svg"
        alt=""
        width={cfg.icon}
        height={cfg.icon}
        className="shrink-0 drop-shadow-[0_8px_24px_rgba(255,77,109,0.35)]"
        draggable={false}
      />
      {showText && (
        <span className={`font-display leading-none tracking-tight ${cfg.text} ${textClassName}`}>
          Forever, Somewhere
        </span>
      )}
    </>
  );

  const wrapClass = `inline-flex items-center gap-3 ${className}`;

  if (to) {
    return (
      <Link to={to} className={`${wrapClass} transition hover:opacity-90`} aria-label="Forever, Somewhere home">
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
