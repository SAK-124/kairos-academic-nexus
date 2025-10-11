import { useCallback, useEffect, useRef, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const isBrowser = typeof window !== 'undefined';
  const keyRef = useRef(key);

  const readValue = useCallback(() => {
    if (!isBrowser) return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn('Failed to read localStorage key', key, error);
      return initialValue;
    }
  }, [initialValue, isBrowser, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setStoredValue(readValue());
    }
  }, [key, readValue]);

  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn('Failed to write localStorage key', key, error);
    }
  }, [isBrowser, key, storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prevValue) => {
      return value instanceof Function ? value(prevValue) : value;
    });
  }, []);

  return [storedValue, setValue] as const;
}
