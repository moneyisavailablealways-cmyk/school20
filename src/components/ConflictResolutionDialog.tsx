import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Monitor, Smartphone } from 'lucide-react';
import { removeSyncItem, updateSyncItemStatus, type SyncQueueItem } from '@/lib/offline/db';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: SyncQueueItem[];
  onResolved: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  onResolved,
}: ConflictResolutionDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolving, setResolving] = useState(false);
  const { toast } = useToast();

  const current = conflicts[currentIndex];
  if (!current) return null;

  const handleKeepLocal = async () => {
    setResolving(true);
    try {
      const allowedTables = ['attendance_records', 'subject_submissions', 'behavior_notes', 'timetables'] as const;
      if (!allowedTables.includes(current.table as any)) {
        throw new Error('Invalid table');
      }

      const { id, ...updateData } = current.data;
      const { error } = await supabase
        .from(current.table as any)
        .upsert(current.data as any);

      if (error) throw error;

      await removeSyncItem(current.id);
      toast({ title: 'Resolved', description: 'Local version saved to server.' });
      moveNext();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  const handleKeepServer = async () => {
    setResolving(true);
    try {
      await removeSyncItem(current.id);
      toast({ title: 'Resolved', description: 'Server version kept. Local changes discarded.' });
      moveNext();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  const handleDiscardAll = async () => {
    setResolving(true);
    try {
      for (const conflict of conflicts) {
        await removeSyncItem(conflict.id);
      }
      toast({ title: 'All conflicts discarded', description: 'Server versions kept for all conflicts.' });
      onResolved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  const moveNext = () => {
    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onResolved();
      onOpenChange(false);
      setCurrentIndex(0);
    }
  };

  const formatData = (data: Record<string, unknown>) => {
    const important = ['status', 'marks', 'remarks', 'date', 'session'];
    return Object.entries(data)
      .filter(([key]) => important.includes(key) || key === 'id')
      .map(([key, value]) => (
        <div key={key} className="flex justify-between text-sm">
          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="font-medium">{String(value)}</span>
        </div>
      ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Sync Conflict
          </DialogTitle>
          <DialogDescription>
            A record was modified on another device while you were offline.
            Choose which version to keep.
            <span className="block mt-1 text-xs">
              Conflict {currentIndex + 1} of {conflicts.length}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{current.table.replace(/_/g, ' ')}</Badge>
            <Badge variant="secondary">{current.operation}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  Your Offline Version
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {formatData(current.data)}
                <p className="text-xs text-muted-foreground mt-2">
                  Saved: {new Date(current.timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Monitor className="h-4 w-4" />
                  Server Version
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {current.conflictData ? formatData(current.conflictData) : (
                  <p className="text-xs text-muted-foreground">Modified on another device</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {conflicts.length > 1 && (
            <Button variant="ghost" size="sm" onClick={handleDiscardAll} disabled={resolving}>
              Discard All Conflicts
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleKeepServer} disabled={resolving}>
              Keep Server
            </Button>
            <Button onClick={handleKeepLocal} disabled={resolving}>
              Keep My Version
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
