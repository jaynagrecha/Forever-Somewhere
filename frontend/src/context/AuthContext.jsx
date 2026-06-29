import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setCoupleTokenGetter } from '../api/client';

const TOKEN_KEY = 'forever_couple_token';
const MY_NAME_KEY = 'forever_my_name';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [couple, setCouple] = useState(null);
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
    setToken(null);
    setCouple(null);
  }, []);

  const login = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setCouple(session.couple);
  }, []);

  useEffect(() => {
    setCoupleTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setCouple(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getCoupleMe()
      .then((profile) => setCouple(profile))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, logout]);

  const value = useMemo(
    () => ({
      token,
      couple,
      loading,
      isAuthed: !!token && !!couple,
      login,
      logout,
      partnerNames: couple ? [couple.partner1_name, couple.partner2_name] : [],
      displayName: couple?.display_name || '',
      inviteCode: couple?.invite_code || '',
    }),
    [token, couple, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}

/** Dropdown options: both partners + "Us" */
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

/** Who is using this device — stored locally so pings and answers credit the right partner */
export function useMyName() {
  const { partnerNames } = useAuth();
  const names = partnerNames.length >= 2 ? partnerNames : [];

  const readStored = () => {
    const stored = localStorage.getItem(MY_NAME_KEY);
    if (stored && names.includes(stored)) return stored;
    return '';
  };

  const [myName, setMyNameState] = useState(readStored);

  useEffect(() => {
    const stored = readStored();
    setMyNameState(stored);
  }, [partnerNames.join('|')]);

  const setMyName = useCallback(
    (name) => {
      if (name && names.includes(name)) {
        localStorage.setItem(MY_NAME_KEY, name);
        setMyNameState(name);
      } else if (!name) {
        localStorage.removeItem(MY_NAME_KEY);
        setMyNameState('');
      }
    },
    [names]
  );

  return useMemo(
    () => ({
      myName,
      setMyName,
      partnerNames: names,
      needsSetup: names.length >= 2 && !myName,
    }),
    [myName, setMyName, names]
  );
}
