import { useState, useCallback } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsyncState<T>(initialData: T | null = null) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const run = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await asyncFn();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((prev) => ({ ...prev, loading: false, error }));
      return null;
    }
  }, []);

  const reset = useCallback((data: T | null = null) => {
    setState({ data, loading: false, error: null });
  }, []);

  return { ...state, run, reset, setData: (data: T | null) => setState((p) => ({ ...p, data })) };
}
