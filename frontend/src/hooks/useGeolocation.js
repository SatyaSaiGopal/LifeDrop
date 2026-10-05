import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser Geolocation API wrapper. Handles every failure mode explicitly so
 * the UI can show a real message instead of a spinner that never resolves.
 */
export const GEO_ERROR_MESSAGES = {
  PERMISSION_DENIED: 'Location access was blocked. Allow it in your browser settings, or search by city instead.',
  POSITION_UNAVAILABLE: 'Your location is unavailable right now. Try searching by city instead.',
  TIMEOUT: 'Getting your location took too long. Please try again or search by city.',
  UNSUPPORTED: 'This browser does not support location access. Please search by city instead.',
};

export function useGeolocation() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(
    (options = {}) =>
      new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          const message = GEO_ERROR_MESSAGES.UNSUPPORTED;
          if (mounted.current) {
            setStatus('error');
            setError(message);
          }
          reject(new Error(message));
          return;
        }

        setStatus('loading');
        setError(null);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            if (!mounted.current) return;
            setCoords(next);
            setStatus('success');
            resolve(next);
          },
          (err) => {
            const key =
              err.code === 1 ? 'PERMISSION_DENIED' : err.code === 2 ? 'POSITION_UNAVAILABLE' : 'TIMEOUT';
            const message = GEO_ERROR_MESSAGES[key];
            if (mounted.current) {
              setStatus('error');
              setError(message);
            }
            reject(new Error(message));
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000, ...options }
        );
      }),
    []
  );

  return { status, coords, error, request, setCoords };
}
