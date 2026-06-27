import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function GlobalSearch() {
  const { search, online } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  async function handleSearch(value) {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    if (online) {
      try {
        const { api } = await import('../api/client');
        setResults(await api.search(value));
        return;
      } catch {
        /* fallback */
      }
    }
    setResults(search(value));
  }

  return (
    <div className="relative mb-8">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search memories, dreams, notes…"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-ink shadow-2xl">
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              type="button"
              className="block w-full border-b border-white/5 px-4 py-3 text-left hover:bg-white/5"
              onMouseDown={() => navigate(r.route)}
            >
              <span className="text-xs uppercase text-accent-soft">{r.kind}</span>
              <div className="font-medium">{r.title}</div>
              {r.subtitle && <div className="text-sm text-muted">{r.subtitle}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
