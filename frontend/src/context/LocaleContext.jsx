import { createContext, useContext, useMemo, useState } from 'react';
import { t as translate } from '../utils/i18n';

const LocaleContext = createContext(null);
const KEY = 'forever_locale';

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem(KEY) || 'en');

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next) => {
        localStorage.setItem(KEY, next);
        setLocale(next);
      },
      t: (key) => translate(locale, key),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale requires LocaleProvider');
  return ctx;
}
