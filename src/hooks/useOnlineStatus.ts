import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionStatus = 'online' | 'limited' | 'offline';

interface OnlineStatusResult {
  isOnline: boolean;
  connectionStatus: ConnectionStatus;
  lastOnlineAt: number | null;
  checkConnection: () => Promise<void>;
}

const PING_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 5000; // 5 seconds

export function useOnlineStatus(): OnlineStatusResult {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(
    navigator.onLine ? Date.now() : null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectionStatus('offline');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

      const start = Date.now();
      // Use a lightweight endpoint to test connectivity
      await fetch(`https://lbserxuqjcxmuvucokyc.supabase.co/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxic2VyeHVxamN4bXV2dWNva3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzM4NzksImV4cCI6MjA3MTkwOTg3OX0.PY9UEtmWGwZ1Ec0VEQjsKaA6iH39JPC54pA0yvcOmmo',
        },
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - start;
      if (latency > 3000) {
        setConnectionStatus('limited');
      } else {
        setConnectionStatus('online');
        setLastOnlineAt(Date.now());
      }
    } catch {
      // Fetch failed but navigator says online = limited
      if (navigator.onLine) {
        setConnectionStatus('limited');
      } else {
        setConnectionStatus('offline');
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setLastOnlineAt(Date.now());
      checkConnection();
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check
    pingIntervalRef.current = setInterval(checkConnection, PING_INTERVAL);

    // Initial check
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [checkConnection]);

  return {
    isOnline: connectionStatus === 'online',
    connectionStatus,
    lastOnlineAt,
    checkConnection,
  };
}
