import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string[];
  published_date: string;
  expiry_date: string;
  is_active: boolean;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();

    // Real-time subscription for announcements
    const announcementsChannel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          console.log('Announcements changed, refetching data');
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(announcementsChannel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('published_date', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            High Priority
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Medium Priority
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Low Priority
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Normal
          </Badge>
        );
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    return expiry <= threeDaysFromNow && expiry > now;
  };

  const isNew = (publishedDate: string) => {
    const published = new Date(publishedDate);
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    return published >= threeDaysAgo;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">School Announcements</h1>
        <p className="text-muted-foreground">Stay updated with the latest news and important information</p>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No Announcements</p>
            <p className="text-muted-foreground text-center">
              There are currently no active announcements. Check back later for updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className={`${
                announcement.priority === 'high' 
                  ? 'border-l-4 border-l-red-500' 
                  : announcement.priority === 'medium'
                  ? 'border-l-4 border-l-yellow-500'
                  : ''
              } ${isNew(announcement.published_date) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getPriorityIcon(announcement.priority)}
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      {isNew(announcement.published_date) && (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Published: {formatDate(announcement.published_date)}
                      </span>
                      {announcement.expiry_date && (
                        <span className={`flex items-center gap-1 ${
                          isExpiringSoon(announcement.expiry_date) ? 'text-orange-600 font-medium' : ''
                        }`}>
                          <Calendar className="h-4 w-4" />
                          Expires: {formatDate(announcement.expiry_date)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {getPriorityBadge(announcement.priority)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                  {announcement.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {announcement.target_audience && announcement.target_audience.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">Target audience:</span>
                    {announcement.target_audience.map((audience, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {audience.charAt(0).toUpperCase() + audience.slice(1)}
                      </Badge>
                    ))}
                  </div>
                )}

                {isExpiringSoon(announcement.expiry_date) && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800 mb-4">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      This announcement expires soon. Make sure to take note of any important information.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    Mark as Read
                  </Button>
                  <Button variant="outline" size="sm">
                    Save for Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;