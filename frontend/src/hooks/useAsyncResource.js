import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetch-on-change helper with abort handling, so a fast sequence of filter
 * changes cannot leave a stale response on screen.
 *
 * @param {Function} fetcher  receives ({ signal }) and returns a promise
 * @param {Array} deps        re-fetch when these change
 * @param {{ enabled?: boolean }} options
 */
export function useAsyncResource(fetcher, deps, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: enabled });
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, meta: null, error: null, loading: false });
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (!active) return;
        // Support both { data, meta } and bare data responses.
        const data = result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
        const meta = result && Object.prototype.hasOwnProperty.call(result, 'meta') ? result.meta : null;
        setState({ data, meta, error: null, loading: false });
      })
      .catch((err) => {
        if (!active || err.name === 'AbortError') return;
        setState({ data: null, meta: null, error: err, loading: false });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { ...state, reload, setData: (data) => setState((prev) => ({ ...prev, data })) };
}
