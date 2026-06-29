import { useEffect, useMemo, useState } from 'react';

export function useGeocode(query, minLength = 3, delay = 600) {
  const trimmed = query.trim();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trimmed.length < minLength) return undefined;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [trimmed, minLength, delay]);

  const visibleSuggestions = useMemo(
    () => (trimmed.length < minLength ? [] : suggestions),
    [trimmed.length, minLength, suggestions]
  );

  return {
    suggestions: visibleSuggestions,
    loading: trimmed.length >= minLength && loading,
    clearSuggestions: () => setSuggestions([]),
  };
}

export function pickLocation(loc) {
  return {
    title: loc.display_name,
    lat: parseFloat(loc.lat),
    lng: parseFloat(loc.lon),
  };
}
