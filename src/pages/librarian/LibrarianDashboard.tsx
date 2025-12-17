import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const LibrarianDashboard = () => {
  const navigate = useNavigate();

  // Fetch library statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['library-stats'],
    queryFn: async () => {
      // Total items and copies
      const { data: items, error: itemsError } = await supabase
        .from('library_items')
        .select('total_copies, available_copies')
        .eq('is_active', true);
      
      if (itemsError) throw itemsError;

      const totalBooks = items?.reduce((sum, item) => sum + item.total_copies, 0) || 0;
      const availableBooks = items?.reduce((sum, item) => sum + item.available_copies, 0) || 0;
      const borrowedBooks = totalBooks - availableBooks;

      // Overdue items count
      const { count: overdueCount, error: overdueError } = await supabase
        .from('library_transactions')
        .select('*', { count: 'exact', head: true })
        .is('return_date', null)
        .lt('due_date', new Date().toISOString());

      if (overdueError) throw overdueError;

      // Active reservations count
      const { count: reservationsCount, error: reservationsError } = await supabase
        .from('library_reservations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'ready', 'active']);

      if (reservationsError) throw reservationsError;

      // New books this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: newBooksCount, error: newBooksError } = await supabase
        .from('library_items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .eq('is_active', true);

      if (newBooksError) throw newBooksError;

      return {
        totalBooks,
        availableBooks,
        borrowedBooks,
        overdueBooks: overdueCount || 0,
        reservations: reservationsCount || 0,
        newBooksThisMonth: newBooksCount || 0
      };
    }
  });

  // Fetch recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from('library_transactions')
        .select(`
          id,
          transaction_type,
          issue_date,
          return_date,
          due_date,
          is_overdue,
          library_item_id,
          borrower_id
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch item details
      const itemIds = [...new Set(transactions?.map(t => t.library_item_id).filter(Boolean))];
      const { data: items } = await supabase
        .from('library_items')
        .select('id, title')
        .in('id', itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000']);

      // Fetch borrower details
      const borrowerIds = [...new Set(transactions?.map(t => t.borrower_id).filter(Boolean))];
      const { data: borrowers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', borrowerIds.length > 0 ? borrowerIds : ['00000000-0000-0000-0000-000000000000']);

      const itemsMap = new Map(items?.map(i => [i.id, i]) || []);
      const borrowersMap = new Map(borrowers?.map(b => [b.id, b]) || []);

      return transactions?.map(t => ({
        id: t.id,
        bookTitle: itemsMap.get(t.library_item_id)?.title || 'Unknown Book',
        borrower: borrowersMap.get(t.borrower_id) 
          ? `${borrowersMap.get(t.borrower_id)?.first_name} ${borrowersMap.get(t.borrower_id)?.last_name}`
          : 'Unknown',
        type: t.return_date ? 'return' : 'borrow',
        date: t.return_date || t.issue_date,
        dueDate: t.due_date,
        isOverdue: t.is_overdue || (!t.return_date && new Date(t.due_date) < new Date())
      })) || [];
    }
  });

  // Fetch overdue items
  const { data: overdueItems, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-items'],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from('library_transactions')
        .select(`
          id,
          due_date,
          fine_amount,
          library_item_id,
          borrower_id
        `)
        .is('return_date', null)
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      // Fetch item details
      const itemIds = [...new Set(transactions?.map(t => t.library_item_id).filter(Boolean))];
      const { data: items } = await supabase
        .from('library_items')
        .select('id, title')
        .in('id', itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000']);

      // Fetch borrower details
      const borrowerIds = [...new Set(transactions?.map(t => t.borrower_id).filter(Boolean))];
      const { data: borrowers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', borrowerIds.length > 0 ? borrowerIds : ['00000000-0000-0000-0000-000000000000']);

      const itemsMap = new Map(items?.map(i => [i.id, i]) || []);
      const borrowersMap = new Map(borrowers?.map(b => [b.id, b]) || []);

      return transactions?.map(t => {
        const daysOverdue = differenceInDays(new Date(), new Date(t.due_date));
        return {
          id: t.id,
          bookTitle: itemsMap.get(t.library_item_id)?.title || 'Unknown Book',
          borrower: borrowersMap.get(t.borrower_id) 
            ? `${borrowersMap.get(t.borrower_id)?.first_name} ${borrowersMap.get(t.borrower_id)?.last_name}`
            : 'Unknown',
          dueDate: t.due_date,
          daysOverdue,
          fine: t.fine_amount || daysOverdue * 0.50 // Default fine calculation
        };
      }) || [];
    }
  });

  // Fetch popular books (most borrowed in last 30 days)
  const { data: popularBooks, isLoading: popularLoading } = useQuery({
    queryKey: ['popular-books'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error } = await supabase
        .from('library_transactions')
        .select('library_item_id')
        .gte('issue_date', thirtyDaysAgo.toISOString())
        .eq('transaction_type', 'borrow');

      if (error) throw error;

      // Count borrows per book
      const borrowCounts = new Map<string, number>();
      transactions?.forEach(t => {
        if (t.library_item_id) {
          borrowCounts.set(t.library_item_id, (borrowCounts.get(t.library_item_id) || 0) + 1);
        }
      });

      // Get top 5 book IDs
      const topBookIds = [...borrowCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (topBookIds.length === 0) return [];

      // Fetch book titles
      const { data: books } = await supabase
        .from('library_items')
        .select('id, title')
        .in('id', topBookIds);

      const booksMap = new Map(books?.map(b => [b.id, b.title]) || []);

      return topBookIds.map(id => ({
        title: booksMap.get(id) || 'Unknown Book',
        borrowCount: borrowCounts.get(id) || 0
      }));
    }
  });

  const isLoading = statsLoading || transactionsLoading || overdueLoading || popularLoading;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your library resources and track borrowing activities.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(stats?.totalBooks || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.newBooksThisMonth || 0} this month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Borrowed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.borrowedBooks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalBooks ? Math.round((stats.borrowedBooks / stats.totalBooks) * 100) : 0}% of collection
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.overdueBooks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.reservations || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active reservations
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest borrowing and return activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentTransactions && recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {transaction.type === 'borrow' ? (
                        <BookOpen className="h-4 w-4 text-primary" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{transaction.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">{transaction.borrower}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      transaction.type === 'borrow' ? 'default' : 
                      transaction.isOverdue ? 'destructive' : 'secondary'
                    }>
                      {transaction.type}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {transaction.date ? format(new Date(transaction.date), 'MMM dd, yyyy') : '-'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent transactions</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate('/librarian/transactions')}>
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* Overdue Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Overdue Items
            </CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : overdueItems && overdueItems.length > 0 ? (
              overdueItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{item.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">{item.borrower}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-destructive">
                      {item.daysOverdue} days overdue
                    </p>
                    <p className="text-sm text-muted-foreground">Fine: ${item.fine.toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No overdue items</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate('/librarian/transactions')}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              View All Overdue
            </Button>
          </CardContent>
        </Card>

        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Books
            </CardTitle>
            <CardDescription>Most borrowed books this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : popularBooks && popularBooks.length > 0 ? (
              popularBooks.map((book, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-foreground">{book.title}</span>
                  </div>
                  <Badge variant="secondary">{book.borrowCount} borrows</Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No borrowing data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common library management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/librarian/catalog')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Add New Book
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/librarian/transactions')}>
              <Users className="mr-2 h-4 w-4" />
              Issue Book
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/librarian/transactions')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Return Book
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/librarian/fines')}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Manage Fines
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LibrarianDashboard;
