import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { getPortalBasePath } from '@/lib/portalPaths';

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const TYPE_LABELS: Record<string, string> = {
  message: 'New message',
  message_reply: 'Reply',
  appointment: 'Appointment',
  appointment_reminder: 'Reminder',
  announcement: 'Announcement',
  fee: 'Fees',
  academic: 'Academic',
};

export const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(15);

  const base = getPortalBasePath(profile?.role);

  const targetFor = (n: AppNotification) => {
    const t = `${n.type || ''} ${n.reference_type || ''} ${n.category || ''}`.toLowerCase();
    if (t.includes('message') || t.includes('communication')) {
      return n.reference_id ? `${base}/communication?message=${n.reference_id}` : `${base}/communication`;
    }
    if (t.includes('appointment')) {
      return n.reference_id ? `${base}/appointments?appointment=${n.reference_id}` : `${base}/appointments`;
    }
    if (t.includes('fee') || t.includes('invoice') || t.includes('payment')) return `${base}/fees`;
    return `${base}/communication`;
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.is_read) await markAsRead([n.id]);
    setOpen(false);
    navigate(targetFor(n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">You have no notifications yet.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-accent transition-colors',
                      !n.is_read && 'bg-accent/40',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          {n.type && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {TYPE_LABELS[n.type] || n.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{formatWhen(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate(`${base}/communication`);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
