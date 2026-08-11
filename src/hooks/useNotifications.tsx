import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  category: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = (limit = 20) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id,title,message,type,category,reference_id,reference_type,is_read,created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    const rows = (data || []) as AppNotification[];
    setNotifications(rows);

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
    setLoading(false);
  }, [profile?.id, limit]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => fetchNotifications(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', ids);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    fetchNotifications();
  }, [profile?.id, fetchNotifications]);

  return { notifications, unreadCount, loading, refetch: fetchNotifications, markAsRead, markAllAsRead };
};
