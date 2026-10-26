import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api/client';

/** Fetches `path` (null = skip). Re-fetches when the path changes or on reload(). */
export function useApi<T>(path: string | null, { pollMs }: { pollMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const seq = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      if (path === null) return;
      const id = ++seq.current;
      if (!quiet) setLoading(true);
      try {
        const result = await api<T>(path);
        if (id === seq.current) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (id === seq.current) setError(e as Error);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => load(true), pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  return { data, error, loading, reload: () => load(true) };
}
