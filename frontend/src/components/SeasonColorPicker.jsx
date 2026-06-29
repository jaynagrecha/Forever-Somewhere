import { Check, Pipette } from 'lucide-react';
import { useMemo, useRef } from 'react';

const MOOD_COLORS = [
  { name: 'Rose', hex: '#ff4d6d' },
  { name: 'Blush', hex: '#ff8fa3' },
  { name: 'Coral', hex: '#ff6b6b' },
  { name: 'Gold', hex: '#facc15' },
  { name: 'Amber', hex: '#ff9933' },
  { name: 'Violet', hex: '#a78bfa' },
  { name: 'Sky', hex: '#5eb3ff' },
  { name: 'Sage', hex: '#6ee7b7' },
  { name: 'Calm', hex: '#94a3b8' },
  { name: 'Wine', hex: '#be123c' },
];

function normalizeHex(hex) {
  return (hex || '').trim().toLowerCase();
}

function findPreset(hex) {
  const n = normalizeHex(hex);
  return MOOD_COLORS.find((c) => c.hex.toLowerCase() === n) || null;
}

export default function SeasonColorPicker({ value, onChange, label = 'Mood colour' }) {
  const customInputRef = useRef(null);
  const preset = useMemo(() => findPreset(value), [value]);
  const isCustom = Boolean(value && !preset);

  const displayName = preset?.name || (value ? 'Custom' : 'None chosen');
  const safeValue = value || '#ff4d6d';

  function pickPreset(hex) {
    onChange(hex);
  }

  function openCustomPicker() {
    customInputRef.current?.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-sm">
          <span
            className="h-8 w-8 shrink-0 rounded-full ring-2 ring-white/30"
            style={{ backgroundColor: safeValue }}
            aria-hidden
          />
          <span className="font-medium text-white">{displayName}</span>
          <span className="font-mono text-xs uppercase text-muted">{safeValue}</span>
        </div>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full ring-1 ring-white/10"
        style={{
          background: `linear-gradient(90deg, ${safeValue} 0%, ${safeValue}88 55%, transparent 100%)`,
        }}
        aria-hidden
      />

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6">
        {MOOD_COLORS.map((c) => {
          const selected = normalizeHex(value) === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              aria-label={`${c.name} (${c.hex})`}
              aria-pressed={selected}
              onClick={() => pickPreset(c.hex)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                selected
                  ? 'border-white/40 bg-white/10 shadow-lg shadow-black/20'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
              }`}
            >
              <span
                className={`relative h-10 w-10 rounded-full transition ${
                  selected ? 'ring-2 ring-white ring-offset-2 ring-offset-ink' : 'ring-1 ring-white/20'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {selected && (
                  <Check
                    size={16}
                    className="absolute inset-0 m-auto text-white drop-shadow-md"
                    strokeWidth={3}
                  />
                )}
              </span>
              <span className={`text-[10px] leading-tight sm:text-xs ${selected ? 'text-white' : 'text-muted'}`}>
                {c.name}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Custom colour"
          aria-pressed={isCustom}
          onClick={openCustomPicker}
          className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
            isCustom
              ? 'border-white/40 bg-white/10 shadow-lg shadow-black/20'
              : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
          }`}
        >
          <span
            className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ${
              isCustom ? 'ring-2 ring-white ring-offset-2 ring-offset-ink' : 'ring-1 ring-white/20'
            }`}
            style={isCustom ? { backgroundColor: safeValue } : undefined}
          >
            {!isCustom && (
              <span className="absolute inset-0 bg-gradient-to-br from-rose-400 via-violet-400 to-sky-400 opacity-90" />
            )}
            {isCustom ? (
              <Check size={16} className="relative text-white drop-shadow-md" strokeWidth={3} />
            ) : (
              <Pipette size={16} className="relative text-white drop-shadow-md" />
            )}
          </span>
          <span className={`text-[10px] leading-tight sm:text-xs ${isCustom ? 'text-white' : 'text-muted'}`}>
            Custom
          </span>
          <input
            ref={customInputRef}
            type="color"
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            tabIndex={-1}
          />
        </button>
      </div>

      {isCustom && (
        <p className="text-xs text-muted">
          Custom colour selected — tap the swatch again to fine-tune in the system picker.
        </p>
      )}
    </div>
  );
}
