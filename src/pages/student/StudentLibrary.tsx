import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Eye,
  Heart
} from 'lucide-react';

const StudentLibrary = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Get borrowed books
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
            category
          )
        `)
        .eq('borrower_id', profile?.id)
        .eq('transaction_type', 'borrow')
        .is('return_date', null)
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

  // Get reservations
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
            category
          )
        `)
        .eq('reserver_id', profile?.id)
        .eq('status', 'active')
        .order('reservation_date', { ascending: false });

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
        .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,isbn.ilike.%${searchQuery}%`)
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Library</h1>
        <p className="text-muted-foreground mt-2">
          Manage your borrowed books, reservations, and search the catalog
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Books Borrowed</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{borrowedBooks?.length || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Active Reservations</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{reservations?.length || 0}</div>
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
      </div>

      {/* Search Section */}
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
              placeholder="Search by title, author, or ISBN..."
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
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{item.category}</Badge>
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
        </CardContent>
      </Card>

      {/* Borrowed Books */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Currently Borrowed Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          {borrowedBooks && borrowedBooks.length > 0 ? (
            <div className="space-y-4">
              {borrowedBooks.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{transaction.library_items?.title}</h4>
                    <p className="text-sm text-muted-foreground">{transaction.library_items?.author}</p>
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
                  </div>
                  <div className="text-right">
                    {isOverdue(transaction.due_date) ? (
                      <Badge variant="destructive" className="mb-2">
                        Overdue
                      </Badge>
                    ) : getDaysUntilDue(transaction.due_date) <= 3 ? (
                      <Badge variant="outline" className="mb-2">
                        Due Soon
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mb-2">
                        Active
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {getDaysUntilDue(transaction.due_date)} days left
                    </div>
                  </div>
                </div>
              ))}
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
              {reservations.map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{reservation.library_items?.title}</h4>
                    <p className="text-sm text-muted-foreground">{reservation.library_items?.author}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Reserved: {new Date(reservation.reservation_date).toLocaleDateString()}</span>
                      <span>Expires: {new Date(reservation.expiry_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">Reserved</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Fines */}
      {fines && fines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Outstanding Fines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fines.map((fine) => (
                <div key={fine.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{fine.fine_type}</h4>
                    <p className="text-sm text-muted-foreground">{fine.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Date: {new Date(fine.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">${Number(fine.amount).toFixed(2)}</div>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentLibrary;