import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  BookOpen, 
  Users, 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  Download,
  Upload,
  Search
} from "lucide-react";

const LibraryDashboard = () => {
  const { profile } = useAuth();

  // Fetch library statistics
  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: async () => {
      const [itemsResult, transactionsResult, overdueResult, reservationsResult] = await Promise.all([
        supabase.from('library_items').select('id, item_type, available_copies, total_copies').eq('is_active', true),
        supabase.from('library_transactions').select('id, transaction_type, due_date, return_date').is('return_date', null),
        supabase.from('library_transactions').select('id').is('return_date', null).lt('due_date', new Date().toISOString()),
        supabase.from('library_reservations').select('id').eq('status', 'active')
      ]);

      const totalItems = itemsResult.data?.length || 0;
      const totalCopies = itemsResult.data?.reduce((sum, item) => sum + item.total_copies, 0) || 0;
      const availableCopies = itemsResult.data?.reduce((sum, item) => sum + item.available_copies, 0) || 0;
      const checkedOut = transactionsResult.data?.length || 0;
      const overdue = overdueResult.data?.length || 0;
      const reservations = reservationsResult.data?.length || 0;

      return {
        totalItems,
        totalCopies,
        availableCopies,
        checkedOut,
        overdue,
        reservations
      };
    }
  });

  // Fetch recent transactions
  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          *,
          library_items (title, author),
          profiles!library_transactions_borrower_id_fkey (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch overdue items
  const { data: overdueItems } = useQuery({
    queryKey: ['overdue-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          *,
          library_items (title, author),
          profiles!library_transactions_borrower_id_fkey (first_name, last_name)
        `)
        .is('return_date', null)
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch popular items
  const { data: popularItems } = useQuery({
    queryKey: ['popular-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          library_item_id,
          library_items (title, author)
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      // Count transactions per item
      const itemCounts = {};
      data?.forEach(transaction => {
        const itemId = transaction.library_item_id;
        itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
      });

      // Get top 5 most borrowed items
      const sortedItems = Object.entries(itemCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([itemId, count]) => {
          const item = data?.find(t => t.library_item_id === itemId)?.library_items;
          return { ...item, borrowCount: count as number };
        });

      return sortedItems;
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Library Dashboard</h1>
          <p className="text-muted-foreground">
            Manage library resources and track borrowing activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Search Catalog
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unique titles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Copies</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCopies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Physical copies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.availableCopies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready to borrow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.checkedOut || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently borrowed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.overdue || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.reservations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest borrowing and return activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions?.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium text-sm">{transaction.library_items?.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      by {transaction.library_items?.author}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.profiles?.first_name} {transaction.profiles?.last_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      transaction.transaction_type === 'borrow' ? 'default' : 
                      transaction.transaction_type === 'return' ? 'secondary' : 'outline'
                    }>
                      {transaction.transaction_type}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentTransactions || recentTransactions.length === 0) && (
                <p className="text-muted-foreground text-sm">No recent transactions.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Overdue Items
            </CardTitle>
            <CardDescription>Items that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueItems?.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <div>
                    <h4 className="font-medium text-sm">{transaction.library_items?.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Borrowed by: {transaction.profiles?.first_name} {transaction.profiles?.last_name}
                    </p>
                    <p className="text-xs text-destructive">
                      Due: {new Date(transaction.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-destructive">
                      {Math.ceil((Date.now() - new Date(transaction.due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                    </p>
                    <Button variant="outline" size="sm">
                      Send Reminder
                    </Button>
                  </div>
                </div>
              ))}
              {(!overdueItems || overdueItems.length === 0) && (
                <p className="text-muted-foreground text-sm">No overdue items.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Popular Items (Last 30 Days)
          </CardTitle>
          <CardDescription>Most frequently borrowed items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {popularItems?.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg text-center">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium text-sm">{item?.title}</h4>
                <p className="text-xs text-muted-foreground">{item?.author}</p>
                <Badge variant="secondary" className="mt-2">
                  {item?.borrowCount} borrows
                </Badge>
              </div>
            ))}
            {(!popularItems || popularItems.length === 0) && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No borrowing activity in the last 30 days.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LibraryDashboard;