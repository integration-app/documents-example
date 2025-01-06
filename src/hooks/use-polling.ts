import { useEffect, useRef } from 'react';

interface PollingConfig {
  url: string;
  interval: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function usePolling({ url, interval, onSuccess, onError }: PollingConfig) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const stopPolling = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const poll = async () => {
    try {
      if (!url) return;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Polling failed');
      
      const data = await response.json();
      onSuccess?.(data);

      timeoutRef.current = setTimeout(poll, interval);
    } catch (error) {
      onError?.(error as Error);
      stopPolling();
    }
  };

  const startPolling = () => {
    poll();
  };

  useEffect(() => {
    return () => stopPolling();
  }, [url]);

  return { startPolling, stopPolling };
} 