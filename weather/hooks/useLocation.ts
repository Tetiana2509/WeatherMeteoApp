import { useEffect, useRef, useState } from 'react';
import * as ExpoLocation from 'expo-location';
import {
  getCoordinatesByQuery,
  getPlaceNameByCoordinates,
} from '../services/geocodingService';
import { Coords } from '../types';

// useLocation: takes only initialLocation, returns location, coords, and a status string
// - status is "loading" during work, error message on failure, or null otherwise.
// - automatically resolves when initialLocation changes and differs from last resolved.
export function useLocation(initialLocation?: string) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const lastResolvedRef = useRef<string>(''); // normalized last resolved location

  useEffect(() => {
    let cancelled = false;
    const nextInput = (initialLocation ?? '').trim();
    const normalized = nextInput.toLowerCase();

    // If empty, reset and stop
    if (!nextInput) {
      setCoords(null);
      setStatus(null);
      lastResolvedRef.current = '';
      return;
    }

    // Skip if same as last resolved input
    if (normalized === lastResolvedRef.current) {
      return;
    }

    setStatus('loading');
    (async () => {
      try {
        const resolved = await getCoordinatesByQuery(nextInput);
        if (!resolved) {
          throw new Error(
            'Please also enter the country. For example: "10115, Germany"',
          );
        }
        if (cancelled) return;

        let displayName = nextInput;
        try {
          displayName = await getPlaceNameByCoordinates(
            resolved.lat,
            resolved.lon,
          );
        } catch {
          // keep original input if reverse geocoding fails
        }

        if (!cancelled) {
          setCoords({
            ...resolved,
            displayName,
          });
          lastResolvedRef.current = normalized;
          setStatus(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus((e as Error)?.message || 'Failed to find location');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialLocation]);

  return { coords, status };
}

export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } =
          await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await ExpoLocation.getCurrentPositionAsync({});
        if (!mounted) return;

        const newCoords = {
          lat: current.coords.latitude,
          lon: current.coords.longitude,
        };

        try {
          const displayName = await getPlaceNameByCoordinates(
            newCoords.lat,
            newCoords.lon,
          );
          if (mounted) setCoords({ ...newCoords, displayName });
        } catch {
          if (mounted) setCoords(newCoords);
        }
      } catch {
        // swallow errors; returns null
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return coords;
}
