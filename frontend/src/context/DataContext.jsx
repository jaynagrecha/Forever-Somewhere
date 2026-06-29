import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, isApiAvailable, getApiBase } from '../api/client';
import { useAuth } from './AuthContext';
import { computeInsights, searchAll } from '../utils/insights';
import {
  buildImportPayload,
  clearLocalAfterMigration,
  hasLocalData,
  readLocal,
  wasMigrated,
  writeLocal,
} from '../utils/storage';

const DataContext = createContext(null);

const LS_KEYS = {
  memories: 'forever_somewhere_memories',
  pins: 'forever_somewhere_places',
  dreams: 'forever_somewhere_dreams',
  capsules: 'forever_somewhere_capsules',
  loveNotes: 'forever_somewhere_love_notes',
  importantDates: 'forever_somewhere_important_dates',
  promptAnswers: 'forever_somewhere_prompt_answers',
};

function normalizeMemory(m) {
  return {
    ...m,
    isMilestone: m.is_milestone ?? m.isMilestone ?? false,
    milestoneType: m.milestone_type ?? m.milestoneType ?? '',
    tags: m.tags || [],
    playlist_url: m.playlist_url || '',
  };
}

export function DataProvider({ children }) {
  const { isAuthed, token } = useAuth();
  const [online, setOnline] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState([]);
  const [tripPins, setTripPins] = useState([]);
  const [dreams, setDreams] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [loveNotes, setLoveNotes] = useState([]);
  const [importantDates, setImportantDates] = useState([]);
  const [promptAnswers, setPromptAnswers] = useState([]);
  const [stats, setStats] = useState(null);
  const [onThisDay, setOnThisDay] = useState([]);

  const refreshAll = useCallback(async (useApi) => {
    if (useApi) {
      const [m, p, d, c, n, id, pa, s, otd] = await Promise.all([
        api.getMemories(),
        api.getTripPins(),
        api.getDreams(),
        api.getCapsules(),
        api.getLoveNotes(),
        api.getImportantDates(),
        api.getPromptAnswers(),
        api.getStats(),
        api.getOnThisDay(),
      ]);
      setMemories(m.map(normalizeMemory));
      setTripPins(p);
      setDreams(d);
      setCapsules(c);
      setLoveNotes(n);
      setImportantDates(id);
      setPromptAnswers(pa);
      setStats(s);
      setOnThisDay(otd.memories?.map(normalizeMemory) || []);
      return;
    }

    setMemories(readLocal(LS_KEYS.memories).map(normalizeMemory));
    setTripPins(readLocal(LS_KEYS.pins));
    setDreams(readLocal(LS_KEYS.dreams));
    setCapsules(readLocal(LS_KEYS.capsules));
    setLoveNotes(readLocal(LS_KEYS.loveNotes));
    setImportantDates(readLocal(LS_KEYS.importantDates));
    setPromptAnswers(readLocal(LS_KEYS.promptAnswers));
    setStats(null);
    setOnThisDay(
      readLocal(LS_KEYS.memories)
        .map(normalizeMemory)
        .filter((m) => {
          if (!m.date) return false;
          const d = new Date(m.date);
          const t = new Date();
          return d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
        })
    );
  }, []);

  const connect = useCallback(async (quick = false) => {
    setConnecting(true);
    let available = false;
    try {
      available = await isApiAvailable(quick ? 3 : 8, quick ? 3000 : 4000);
      setOnline(available);

      if (available) {
        try {
          if (hasLocalData() && !wasMigrated()) {
            await api.importLocal(buildImportPayload());
            clearLocalAfterMigration();
          }
        } catch {
          /* migration optional */
        }
        await refreshAll(true);
      } else {
        await refreshAll(false);
      }
    } catch {
      setOnline(false);
      await refreshAll(false);
    } finally {
      setConnecting(false);
      setLoading(false);
    }
    return available;
  }, [refreshAll]);

  useEffect(() => {
    if (!isAuthed || !token) {
      setLoading(false);
      setConnecting(false);
      setOnline(false);
      return;
    }
    connect();
  }, [connect, isAuthed, token]);

  useEffect(() => {
    if (online || connecting) return undefined;
    const timer = setInterval(() => {
      connect(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [online, connecting, connect]);

  const persistLocal = useCallback((key, data) => writeLocal(key, data), []);

  const memoryOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.createMemory(payload);
          setMemories((prev) => [normalizeMemory(created), ...prev]);
          return normalizeMemory(created);
        }
        const item = { id: Date.now(), ...payload, isMilestone: payload.is_milestone, milestoneType: payload.milestone_type };
        const next = [item, ...memories];
        setMemories(next);
        persistLocal(LS_KEYS.memories, next);
        return item;
      },
      update: async (id, payload) => {
        if (online) {
          const updated = await api.updateMemory(id, payload);
          setMemories((prev) => prev.map((m) => (m.id === id ? normalizeMemory(updated) : m)));
          return normalizeMemory(updated);
        }
        const next = memories.map((m) => (m.id === id ? { ...m, ...payload } : m));
        setMemories(next);
        persistLocal(LS_KEYS.memories, next);
      },
      remove: async (id) => {
        if (online) await api.deleteMemory(id);
        const next = memories.filter((m) => m.id !== id);
        setMemories(next);
        if (!online) persistLocal(LS_KEYS.memories, next);
      },
    }),
    [online, memories, persistLocal]
  );

  const pinOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.createTripPin(payload);
          setTripPins((prev) => [created, ...prev]);
          return created;
        }
        const item = { id: Date.now(), ...payload };
        const next = [item, ...tripPins];
        setTripPins(next);
        persistLocal(LS_KEYS.pins, next);
        return item;
      },
      remove: async (id) => {
        if (online) await api.deleteTripPin(id);
        const next = tripPins.filter((p) => p.id !== id);
        setTripPins(next);
        if (!online) persistLocal(LS_KEYS.pins, next);
      },
    }),
    [online, tripPins, persistLocal]
  );

  const dreamOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.createDream(payload);
          setDreams((prev) => [created, ...prev]);
          return created;
        }
        const item = { id: Date.now(), ...payload };
        const next = [item, ...dreams];
        setDreams(next);
        persistLocal(LS_KEYS.dreams, next);
        return item;
      },
      update: async (id, payload) => {
        if (online) {
          const updated = await api.updateDream(id, payload);
          setDreams((prev) => prev.map((d) => (d.id === id ? updated : d)));
          return updated;
        }
        const next = dreams.map((d) => (d.id === id ? { ...d, ...payload } : d));
        setDreams(next);
        persistLocal(LS_KEYS.dreams, next);
      },
      remove: async (id) => {
        if (online) await api.deleteDream(id);
        const next = dreams.filter((d) => d.id !== id);
        setDreams(next);
        if (!online) persistLocal(LS_KEYS.dreams, next);
      },
      promote: async (id) => {
        if (online) {
          const result = await api.promoteDream(id);
          await refreshAll(true);
          return result;
        }
        const dream = dreams.find((d) => d.id === id);
        if (!dream) throw new Error('Dream not found');
        const nextDreams = dreams.map((d) => (d.id === id ? { ...d, status: 'Planned' } : d));
        setDreams(nextDreams);
        persistLocal(LS_KEYS.dreams, nextDreams);
        const pin = {
          id: Date.now(),
          title: dream.location || dream.title,
          lat: 0,
          lng: 0,
          notes: `From dream: ${dream.title}. ${dream.notes || ''}`,
          source_dream_id: id,
        };
        const nextPins = [pin, ...tripPins];
        setTripPins(nextPins);
        persistLocal(LS_KEYS.pins, nextPins);
        return { pin_id: pin.id, needs_geocode: true };
      },
    }),
    [online, dreams, tripPins, persistLocal, refreshAll]
  );

  const capsuleOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.createCapsule(payload);
          setCapsules((prev) => [...prev, created].sort((a, b) => a.unlock_date.localeCompare(b.unlock_date)));
          return created;
        }
        const item = {
          id: Date.now(),
          title: payload.title,
          content: payload.content,
          _content: payload.content,
          unlock_date: payload.unlock_date,
          author: payload.author,
          is_opened: false,
          is_locked: new Date(payload.unlock_date) > new Date(),
          days_until_unlock: Math.ceil(
            (new Date(payload.unlock_date) - new Date()) / (1000 * 60 * 60 * 24)
          ),
        };
        const next = [...capsules, item];
        setCapsules(next);
        persistLocal(LS_KEYS.capsules, next);
        return item;
      },
      open: async (id) => {
        if (online) {
          const opened = await api.openCapsule(id);
          setCapsules((prev) => prev.map((c) => (c.id === id ? opened : c)));
          return opened;
        }
        const next = capsules.map((c) =>
          c.id === id ? { ...c, is_opened: true, is_locked: false, content: c._content || c.content } : c
        );
        setCapsules(next);
        persistLocal(LS_KEYS.capsules, next);
      },
      remove: async (id) => {
        if (online) await api.deleteCapsule(id);
        const next = capsules.filter((c) => c.id !== id);
        setCapsules(next);
        if (!online) persistLocal(LS_KEYS.capsules, next);
      },
    }),
    [online, capsules, persistLocal]
  );

  const noteOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.createLoveNote(payload);
          setLoveNotes((prev) => [created, ...prev]);
          return created;
        }
        const item = { id: Date.now(), ...payload, created_at: new Date().toISOString() };
        const next = [item, ...loveNotes];
        setLoveNotes(next);
        persistLocal(LS_KEYS.loveNotes, next);
        return item;
      },
      remove: async (id) => {
        if (online) await api.deleteLoveNote(id);
        const next = loveNotes.filter((n) => n.id !== id);
        setLoveNotes(next);
        if (!online) persistLocal(LS_KEYS.loveNotes, next);
      },
    }),
    [online, loveNotes, persistLocal]
  );

  const dateOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.createImportantDate(payload);
          setImportantDates((prev) => [...prev, created].sort((a, b) => a.event_date.localeCompare(b.event_date)));
          return created;
        }
        const item = { id: Date.now(), ...payload };
        const next = [...importantDates, item];
        setImportantDates(next);
        persistLocal(LS_KEYS.importantDates, next);
        return item;
      },
      remove: async (id) => {
        if (online) await api.deleteImportantDate(id);
        const next = importantDates.filter((d) => d.id !== id);
        setImportantDates(next);
        if (!online) persistLocal(LS_KEYS.importantDates, next);
      },
    }),
    [online, importantDates, persistLocal]
  );

  const promptOps = useMemo(
    () => ({
      create: async (payload) => {
        if (online) {
          const created = await api.savePromptAnswer(payload);
          setPromptAnswers((prev) => [created, ...prev]);
          return created;
        }
        const item = { id: Date.now(), ...payload, created_at: new Date().toISOString() };
        const next = [item, ...promptAnswers];
        setPromptAnswers(next);
        persistLocal(LS_KEYS.promptAnswers, next);
        return item;
      },
      remove: async (id) => {
        if (online) await api.deletePromptAnswer(id);
        const next = promptAnswers.filter((a) => a.id !== id);
        setPromptAnswers(next);
        if (!online) persistLocal(LS_KEYS.promptAnswers, next);
      },
    }),
    [online, promptAnswers, persistLocal]
  );

  const insights = useMemo(
    () => computeInsights({ memories, dreams, capsules, importantDates }),
    [memories, dreams, capsules, importantDates]
  );

  const search = useCallback(
    (q) => searchAll({ memories, dreams, capsules, loveNotes }, q),
    [memories, dreams, capsules, loveNotes]
  );

  const mapLocations = useMemo(() => {
    const map = new Map();

    tripPins.forEach((pin) => {
      if (pin.lat == null || pin.lng == null || (pin.lat === 0 && pin.lng === 0)) return;
      const key = `${pin.lat?.toFixed(4)},${pin.lng?.toFixed(4)}`;
      map.set(key, {
        key,
        pinId: pin.id,
        title: pin.title,
        lat: pin.lat,
        lng: pin.lng,
        pinNotes: pin.notes,
        isTripPin: true,
        memories: [],
      });
    });

    memories.forEach((memory) => {
      if (memory.lat == null || memory.lng == null) return;
      const key = `${memory.lat.toFixed(4)},${memory.lng.toFixed(4)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          pinId: null,
          title: memory.location,
          lat: memory.lat,
          lng: memory.lng,
          pinNotes: '',
          isTripPin: false,
          memories: [],
        });
      }
      map.get(key).memories.push(memory);
    });

    return Array.from(map.values());
  }, [tripPins, memories]);

  const value = {
    loading,
    connecting,
    online,
    reconnect: connect,
    memories,
    tripPins,
    dreams,
    capsules,
    loveNotes,
    importantDates,
    promptAnswers,
    stats,
    onThisDay,
    insights,
    mapLocations,
    memoryOps,
    pinOps,
    dreamOps,
    capsuleOps,
    noteOps,
    dateOps,
    promptOps,
    search,
    refreshAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
