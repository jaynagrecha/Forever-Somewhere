import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ActivityContext = createContext(null);
export const ACTIVITY_REFRESH_EVENT = 'forever-activity-refresh';

export function ActivityProvider({ children }) {
  const [version, setVersion] = useState(0);

  const refreshActivity = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const handler = () => refreshActivity();
    window.addEventListener(ACTIVITY_REFRESH_EVENT, handler);
    return () => window.removeEventListener(ACTIVITY_REFRESH_EVENT, handler);
  }, [refreshActivity]);

  const value = useMemo(
    () => ({ version, refreshActivity }),
    [version, refreshActivity]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity requires ActivityProvider');
  return ctx;
}
