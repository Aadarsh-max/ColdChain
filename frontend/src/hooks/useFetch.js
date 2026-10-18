import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client.js';

export const useFetch = (fetcher, key, { refreshKey = 0, pollMs = 0, enabled = true } = {}) => {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const fetcherRef = useRef(fetcher);
  const keyRef = useRef(key);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }

    let cancelled = false;

    if (keyRef.current !== key) {
      keyRef.current = key;
      setState({ data: null, error: null, loading: true });
    }

    const load = async () => {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (err) {
        if (!cancelled) setState((prev) => ({ data: prev.data, error: errorMessage(err), loading: false }));
      }
    };

    load();
    const timer = pollMs > 0 ? setInterval(load, pollMs) : null;

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [key, enabled, refreshKey, pollMs]);

  return state;
};