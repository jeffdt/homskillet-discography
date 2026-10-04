import { useEffect, useState } from 'react';
import { Catalog } from './catalog';
import { loadCatalog } from './loadCatalog';

/** Loads the catalog once; null until it is ready. */
export function useCatalog(): Catalog | null {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    let live = true;
    loadCatalog().then((loaded) => {
      if (live) setCatalog(loaded);
    });
    return () => {
      live = false;
    };
  }, []);
  return catalog;
}
