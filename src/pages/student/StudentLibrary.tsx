import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Heart,
  Bell
} from 'lucide-react';

const StudentLibrary = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Get borrowed books with full details
  const { data: borrowedBooks, isLoading: borrowedLoading } = useQuery({
    queryKey: ['student-borrowed-books', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          *,
          library_items (
            title,
            author,
            isbn,
            category,
            item_type,
            subject
          )
        `)
        .eq('borrower_id', profile?.id)
        .eq('transaction_type', 'borrow')
        .order('issue_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Get library fines
  const { data: fines, isLoading: finesLoading } = useQuery({
    queryKey: ['student-library-fines', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_fines')
        .select('*')
        .eq('borrower_id', profile?.id)
        .eq('is_paid', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Get reservations (all active queue statuses)
  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['student-reservations', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_reservations')
        .select(`
          *,
          library_items (
            title,
            author,
            isbn,
            category,
            item_type,
            subject
          )
        `)
        .eq('reserver_id', profile?.id)
        .in('status', ['waiting', 'ready', 'active'])
        .order('queue_position');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Get notifications
  const { data: notifications } = useQuery({
    queryKey: ['student-library-notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('category', 'library')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Search library items
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['library-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,isbn.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
        .order('title')
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length > 2
  });

  // Reserve book mutation
  const reserveMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase
        .from('library_reservations')
        .insert({
          library_item_id: itemId,
          reserver_id: profile?.id,
          expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Book reserved successfully');
      queryClient.invalidateQueries({ queryKey: ['student-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['library-search'] });
    },
    onError: () => {
      toast.error('Failed to reserve book');
    }
  });

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    queryClient.invalidateQueries({ queryKey: ['student-library-notifications'] });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatus = (transaction: any) => {
    if (transaction.return_date) return 'returned';
    if (isOverdue(transaction.due_date)) return 'overdue';
    if (getDaysUntilDue(transaction.due_date) <= 3) return 'due_soon';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'returned':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> Returned</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      case 'due_soon':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Due Soon</Badge>;
      default:
        return <Badge variant="default">Active</Badge>;
    }
  };

  if (borrowedLoading || finesLoading || reservationsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage your borrowed books, reservations, and search the catalog
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalFines = fines?.reduce((sum, fine) => sum + Number(fine.amount), 0) || 0;
  const activeBooks = borrowedBooks?.filter(b => !b.return_date) || [];
  const returnedBooks = borrowedBooks?.filter(b => b.return_date) || [];
  const unreadNotifications = notifications?.filter(n => !n.is_read) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Library</h1>
        <p className="text-muted-foreground mt-2">
          Manage your borrowed books, reservations, and search the catalog
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Books Borrowed</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{activeBooks.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className={(reservations || []).some((r: any) => r.status === 'ready') ? 'border-green-300' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Heart className={`h-5 w-5 ${(reservations || []).some((r: any) => r.status === 'ready') ? 'text-green-500' : 'text-primary'}`} />
              <span className="text-sm font-medium">Active Reservations</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{reservations?.length || 0}</div>
              {(reservations || []).some((r: any) => r.status === 'ready') && (
                <p className="text-xs text-green-600 font-medium">Book ready for pickup!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${totalFines > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <span className="text-sm font-medium">Outstanding Fines</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${totalFines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${totalFines.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Bell className={`h-5 w-5 ${unreadNotifications.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{unreadNotifications.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="borrowed" className="w-full">
        <TabsList>
          <TabsTrigger value="borrowed">Currently Borrowed</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="search">Search Catalog</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Currently Borrowed */}
        <TabsContent value="borrowed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Currently Borrowed Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBooks.length > 0 ? (
                <div className="space-y-4">
                  {activeBooks.map((transaction) => {
                    const status = getStatus(transaction);
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{transaction.library_items?.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            by {transaction.library_items?.author || 'Unknown Author'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {transaction.library_items?.item_type && (
                              <Badge variant="outline">{transaction.library_items.item_type}</Badge>
                            )}
                            {transaction.library_items?.subject && (
                              <Badge variant="outline">{transaction.library_items.subject}</Badge>
                            )}
                            {transaction.library_items?.category && (
                              <Badge variant="outline">{transaction.library_items.category}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Borrowed: {new Date(transaction.issue_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>Due: {new Date(transaction.due_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {transaction.fine_amount > 0 && (
                            <div className="mt-2">
                              <Badge variant="destructive">
                                Fine: ${Number(transaction.fine_amount).toFixed(2)}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {getStatusBadge(status)}
                          <div className="text-xs text-muted-foreground mt-2">
                            {getDaysUntilDue(transaction.due_date)} days {getDaysUntilDue(transaction.due_date) < 0 ? 'overdue' : 'left'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No books currently borrowed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservations */}
          {reservations && reservations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  My Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reservations.map((reservation: any) => (
                    <div 
                      key={reservation.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        reservation.status === 'ready' ? 'border-green-200 bg-green-50/50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{reservation.library_items?.title}</h4>
                        <p className="text-sm text-muted-foreground">{reservation.library_items?.author || 'Unknown author'}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {reservation.library_items?.item_type && (
                            <Badge variant="outline">{reservation.library_items.item_type}</Badge>
                          )}
                          {reservation.library_items?.subject && (
                            <Badge variant="outline">{reservation.library_items.subject}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Queue Position: #{reservation.queue_position}</span>
                          <span>Reserved: {new Date(reservation.reservation_date).toLocaleDateString()}</span>
                        </div>
                        {reservation.hold_until && (
                          <div className="mt-1 text-sm text-orange-600">
                            Must collect by: {new Date(reservation.hold_until).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {reservation.status === 'ready' ? (
                          <Badge variant="default" className="bg-green-500">Ready for Pickup!</Badge>
                        ) : (
                          <Badge variant="secondary">Waiting (#{reservation.queue_position})</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outstanding Fines */}
          <Card className={totalFines > 0 ? 'border-red-200' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className={`h-5 w-5 ${totalFines > 0 ? 'text-red-500' : 'text-green-500'}`} />
                Outstanding Fines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fines && fines.length > 0 ? (
                <div className="space-y-4">
                  {fines.map((fine) => (
                    <div key={fine.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
                      <div className="flex-1">
                        <h4 className="font-medium capitalize">{fine.fine_type.replace('_', ' ')}</h4>
                        <p className="text-sm text-muted-foreground">{fine.description || 'No description'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Date: {new Date(fine.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">${Number(fine.amount).toFixed(2)}</div>
                        <Badge variant="destructive">Unpaid</Badge>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Outstanding:</span>
                      <span className="text-xl font-bold text-red-600">${totalFines.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium text-green-600">No Outstanding Fines</p>
                  <p className="text-sm">You're all clear!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Borrowing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {returnedBooks.length > 0 ? (
                <div className="space-y-4">
                  {returnedBooks.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <h4 className="font-medium">{transaction.library_items?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          by {transaction.library_items?.author || 'Unknown Author'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {transaction.library_items?.item_type && (
                            <Badge variant="outline">{transaction.library_items.item_type}</Badge>
                          )}
                          {transaction.library_items?.subject && (
                            <Badge variant="outline">{transaction.library_items.subject}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Borrowed: {new Date(transaction.issue_date).toLocaleDateString()}</span>
                          <span>Returned: {new Date(transaction.return_date).toLocaleDateString()}</span>
                        </div>
                        {transaction.fine_amount > 0 && (
                          <div className="mt-2">
                            <Badge variant="destructive">
                              Fine Paid: ${Number(transaction.fine_amount).toFixed(2)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" /> Returned
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No borrowing history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Catalog */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Library Catalog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by title, author, ISBN, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" disabled={searchLoading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {searchResults && searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.author}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.item_type && <Badge variant="outline">{item.item_type}</Badge>}
                          {item.subject && <Badge variant="outline">{item.subject}</Badge>}
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                          <span className="text-xs text-muted-foreground">
                            Available: {item.available_copies}/{item.total_copies}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => reserveMutation.mutate(item.id)}
                        disabled={item.available_copies === 0 || reserveMutation.isPending}
                      >
                        Reserve
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length > 2 && !searchLoading && searchResults?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No books found matching your search</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Library Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex items-start justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        notification.is_read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                      }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{notification.title}</h4>
                          {!notification.is_read && (
                            <Badge variant="default" className="h-5 text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentLibrary;
