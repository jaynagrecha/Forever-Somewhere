import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, isUnauthorizedError, setCoupleTokenGetter } from '../api/client';
import { COUPLE_CACHE_KEY, MY_NAME_KEY, TOKEN_KEY } from '../utils/constants';

const AuthContext = createContext(null);

function readCoupleCache() {
  try {
    const raw = localStorage.getItem(COUPLE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCoupleCache(couple) {
  if (couple) {
    localStorage.setItem(COUPLE_CACHE_KEY, JSON.stringify(couple));
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [couple, setCouple] = useState(() => readCoupleCache());
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) {
        await api.logoutCouple();
      }
    } catch {
      /* revoke best-effort */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(COUPLE_CACHE_KEY);
    setToken(null);
    setCouple(null);
  }, []);

  const login = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    writeCoupleCache(session.couple);
    setToken(session.token);
    setCouple(session.couple);
  }, []);

  useEffect(() => {
    setCoupleTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLoading(true);
    });
    api
      .getCoupleMe()
      .then((profile) => {
        if (!active) return;
        setCouple(profile);
        writeCoupleCache(profile);
      })
      .catch((err) => {
        if (!active) return;
        if (isUnauthorizedError(err)) {
          logout();
          return;
        }
        const cached = readCoupleCache();
        if (cached) setCouple(cached);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, logout]);

  const activeCouple = token ? couple : null;

  const value = useMemo(
    () => ({
      token,
      couple: activeCouple,
      loading: token ? loading : false,
      isAuthed: !!token && !!activeCouple,
      login,
      logout,
      partnerNames: activeCouple ? [activeCouple.partner1_name, activeCouple.partner2_name] : [],
      displayName: activeCouple?.display_name || '',
      inviteCode: activeCouple?.invite_code || '',
    }),
    [token, activeCouple, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}

/** @deprecated Prefer usePostingAuthor — only shows this device's identity */
export function useAuthorOptions() {
  const { partnerNames } = useAuth();
  return useMemo(() => {
    if (partnerNames.length >= 2) {
      return ['Us', partnerNames[0], partnerNames[1]];
    }
    return ['Us', 'Partner 1', 'Partner 2'];
  }, [partnerNames]);
}

/** Single partner picker (daily question, quiz) — prefers this device's saved identity */
export function usePartnerPicker(defaultIndex = 0) {
  const { partnerNames } = useAuth();
  const { myName } = useMyName();
  const names = partnerNames.length >= 2 ? partnerNames : ['Partner 1', 'Partner 2'];
  if (myName && names.includes(myName)) return myName;
  return names[defaultIndex] || names[0];
}

/** Locked author for create forms on this device */
export function usePostingAuthor() {
  const { myName, needsSetup } = useMyName();
  const fallback = usePartnerPicker(0);
  const author = myName || fallback;
  return useMemo(
    () => ({ author, myName, needsSetup }),
    [author, myName, needsSetup]
  );
}

/** Who is using this device — stored locally so pings and answers credit the right partner */
export function useMyName() {
  const { partnerNames } = useAuth();
  const names = useMemo(
    () => (partnerNames.length >= 2 ? partnerNames : []),
    [partnerNames]
  );

  const [storedName, setStoredName] = useState(() => {
    const saved = localStorage.getItem(MY_NAME_KEY);
    return saved || '';
  });

  const myName = useMemo(() => {
    if (storedName && names.includes(storedName)) return storedName;
    return '';
  }, [storedName, names]);

  const setMyName = useCallback(
    (name) => {
      if (!name || !names.includes(name)) return false;
      const saved = localStorage.getItem(MY_NAME_KEY);
      if (saved) return saved === name;
      localStorage.setItem(MY_NAME_KEY, name);
      setStoredName(name);
      return true;
    },
    [names]
  );

  const identityLocked = Boolean(myName && names.includes(myName));

  return useMemo(
    () => ({
      myName,
      setMyName,
      partnerNames: names,
      needsSetup: names.length >= 2 && !myName,
      identityLocked,
    }),
    [myName, setMyName, names, identityLocked]
  );
}
