import { WifiOff, WifiLow, CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function OfflineBanner() {
  const { connectionStatus, isSyncing, pendingCount, syncProgress } = useOfflineSync();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when status changes
  if (dismissed && connectionStatus !== 'online') {
    // Keep dismissed
  }

  // Don't show when online and not syncing
  if (connectionStatus === 'online' && !isSyncing) return null;
  if (dismissed && !isSyncing) return null;

  const isOffline = connectionStatus === 'offline';
  const isLimited = connectionStatus === 'limited';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 text-sm border-b transition-colors',
        isSyncing && 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
        isOffline && !isSyncing && 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
        isLimited && !isSyncing && 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
      )}
    >
      {isSyncing ? (
        <CloudUpload className="h-4 w-4 animate-pulse shrink-0" />
      ) : isOffline ? (
        <WifiOff className="h-4 w-4 shrink-0" />
      ) : (
        <WifiLow className="h-4 w-4 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {isSyncing ? (
          <div className="flex items-center gap-3">
            <span>Connection restored. Syncing offline data...</span>
            {syncProgress && (
              <div className="flex items-center gap-2 flex-1 max-w-48">
                <Progress
                  value={(syncProgress.current / syncProgress.total) * 100}
                  className="h-1.5"
                />
                <span className="text-xs whitespace-nowrap">
                  {syncProgress.current}/{syncProgress.total}
                </span>
              </div>
            )}
          </div>
        ) : isOffline ? (
          <span>
            You are currently working offline. Your data will sync automatically when internet is restored.
            {pendingCount > 0 && ` (${pendingCount} pending change${pendingCount > 1 ? 's' : ''})`}
          </span>
        ) : (
          <span>
            Network connection is unstable. Offline mode has been activated to protect your work.
          </span>
        )}
      </div>

      {!isSyncing && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
