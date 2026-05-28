import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` has
 * elapsed without further changes. Useful for keying queries off user input.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debouncedValue;
}
