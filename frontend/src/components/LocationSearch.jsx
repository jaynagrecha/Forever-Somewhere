import { MapPin } from 'lucide-react';
import { useGeocode, pickLocation } from '../hooks/useGeocode';

export default function LocationSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing a place…',
  label = 'Location',
}) {
  const { suggestions, loading, clearSuggestions } = useGeocode(value);

  function handleSelect(loc) {
    const picked = pickLocation(loc);
    onSelect(picked);
    onChange(loc.display_name);
    clearSuggestions();
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-sm text-muted">
          <MapPin size={14} /> {label}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent/50"
        />
      </label>
      {loading && <p className="mt-2 text-xs text-muted">Searching…</p>}
      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink shadow-2xl">
          {suggestions.map((loc, i) => (
            <button
              key={i}
              type="button"
              className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm hover:bg-white/5"
              onClick={() => handleSelect(loc)}
            >
              {loc.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
