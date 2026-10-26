import React, { createContext, useContext, useEffect, useState } from 'react';
import { getHomeBundle, type HomeCmsBundle } from '@/api/settingsApi';

const HomeCmsContext = createContext<HomeCmsBundle | null>(null);

export function HomeCmsProvider({ children }: { children: React.ReactNode }) {
  const [bundle, setBundle] = useState<HomeCmsBundle | null>(null);

  useEffect(() => {
    let alive = true;
    void getHomeBundle()
      .then((data) => {
        if (alive) setBundle(data);
      })
      .catch(() => {
        /* sections fall back to per-block APIs */
      });
    return () => {
      alive = false;
    };
  }, []);

  return <HomeCmsContext.Provider value={bundle}>{children}</HomeCmsContext.Provider>;
}

export function useHomeCms(): HomeCmsBundle | null {
  return useContext(HomeCmsContext);
}
