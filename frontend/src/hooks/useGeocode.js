import { useEffect, useState } from 'react';

export function useGeocode(query, minLength = 3, delay = 600) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < minLength) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
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
  }, [query, minLength, delay]);

  return { suggestions, loading, clearSuggestions: () => setSuggestions([]) };
}

export function pickLocation(loc) {
  return {
    title: loc.display_name,
    lat: parseFloat(loc.lat),
    lng: parseFloat(loc.lon),
  };
}
