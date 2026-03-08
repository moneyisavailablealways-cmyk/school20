import { Wifi, WifiOff, WifiLow, CloudUpload, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function ConnectionStatusIndicator() {
  const { connectionStatus, isOnline, isSyncing, pendingCount, conflicts } = useOfflineSync();

  const statusConfig = {
    online: {
      icon: Wifi,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      label: 'Online',
      description: 'Connected to server',
    },
    limited: {
      icon: WifiLow,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      label: 'Limited',
      description: 'Slow connection detected. Offline mode active.',
    },
    offline: {
      icon: WifiOff,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      label: 'Offline',
      description: 'No internet. Data will sync when connected.',
    },
  };

  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <div className="relative">
              <div className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
              {isSyncing && (
                <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
              )}
            </div>
            <StatusIcon className={cn('h-4 w-4 hidden sm:block', config.textColor)} />
            {isSyncing && (
              <CloudUpload className="h-4 w-4 text-blue-500 animate-pulse" />
            )}
            {pendingCount > 0 && !isSyncing && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                {pendingCount}
              </Badge>
            )}
            {conflicts.length > 0 && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          <div className="space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', config.color)} />
              {config.label}
            </p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {isSyncing && (
              <p className="text-xs text-blue-500">Syncing data...</p>
            )}
            {pendingCount > 0 && !isSyncing && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} change{pendingCount > 1 ? 's' : ''} waiting to sync
              </p>
            )}
            {conflicts.length > 0 && (
              <p className="text-xs text-orange-500">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need resolution
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
