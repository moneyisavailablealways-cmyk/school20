import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Search, BookOpen, User, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LibraryTransaction {
  id: string;
  library_item_id: string;
  borrower_id: string;
  transaction_type: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  is_overdue: boolean;
  fine_amount: number;
  notes?: string;
  library_items?: {
    title: string;
    author: string;
    barcode: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const LibraryTransactions = () => {
  const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<LibraryTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const { toast } = useToast();

  const [newTransaction, setNewTransaction] = useState({
    barcode: '',
    borrower_email: '',
    transaction_type: 'borrow',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, filterType]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          *,
          library_items (title, author, barcode),
          profiles!library_transactions_borrower_id_fkey (first_name, last_name, email)
        `)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (searchQuery) {
      filtered = filtered.filter(transaction => 
        transaction.library_items?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.library_items?.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.profiles?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.profiles?.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => {
        switch (filterType) {
          case 'borrowed':
            return transaction.transaction_type === 'borrow' && !transaction.return_date;
          case 'returned':
            return transaction.return_date !== null;
          case 'overdue':
            return transaction.is_overdue;
          default:
            return true;
        }
      });
    }

    setFilteredTransactions(filtered);
  };

  const handleNewTransaction = async () => {
    try {
      // Find library item by barcode
      const { data: libraryItem, error: itemError } = await supabase
        .from('library_items')
        .select('id')
        .eq('barcode', newTransaction.barcode)
        .single();

      if (itemError) throw new Error('Library item not found');

      // Find borrower by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newTransaction.borrower_email)
        .single();

      if (profileError) throw new Error('Borrower not found');

      const { error } = await supabase
        .from('library_transactions')
        .insert([{
          library_item_id: libraryItem.id,
          borrower_id: profile.id,
          transaction_type: newTransaction.transaction_type,
          due_date: newTransaction.due_date,
          notes: newTransaction.notes
        }]);

      if (error) throw error;

      toast({
        description: "Transaction created successfully",
      });

      setIsNewTransactionOpen(false);
      setNewTransaction({
        barcode: '',
        borrower_email: '',
        transaction_type: 'borrow',
        due_date: '',
        notes: ''
      });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReturn = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('library_transactions')
        .update({
          return_date: new Date().toISOString(),
          is_overdue: false
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast({
        description: "Book returned successfully",
      });

      fetchTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to return book",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (transaction: LibraryTransaction) => {
    if (transaction.return_date) {
      return <Badge variant="secondary">Returned</Badge>;
    }
    if (transaction.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="default">Borrowed</Badge>;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Transactions</h2>
          <p className="text-muted-foreground">
            Manage book borrowing and return transactions.
          </p>
        </div>
        <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Transaction</DialogTitle>
              <DialogDescription>
                Create a new book borrowing or return transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="barcode">Book Barcode</Label>
                <Input
                  id="barcode"
                  value={newTransaction.barcode}
                  onChange={(e) => setNewTransaction({...newTransaction, barcode: e.target.value})}
                  placeholder="Enter book barcode"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="borrower_email">Borrower Email</Label>
                <Input
                  id="borrower_email"
                  value={newTransaction.borrower_email}
                  onChange={(e) => setNewTransaction({...newTransaction, borrower_email: e.target.value})}
                  placeholder="Enter borrower email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transaction_type">Transaction Type</Label>
                <Select value={newTransaction.transaction_type} onValueChange={(value) => setNewTransaction({...newTransaction, transaction_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrow">Borrow</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newTransaction.due_date}
                  onChange={(e) => setNewTransaction({...newTransaction, due_date: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleNewTransaction}>Create Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by book title, barcode, or borrower..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="borrowed">Currently Borrowed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} transaction(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.library_items?.title}</p>
                      <p className="text-sm text-muted-foreground">{transaction.library_items?.barcode}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {transaction.profiles?.first_name} {transaction.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{transaction.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.transaction_type}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(transaction.issue_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(transaction.due_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {transaction.return_date 
                      ? format(new Date(transaction.return_date), 'MMM dd, yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction)}</TableCell>
                  <TableCell>
                    {!transaction.return_date && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReturn(transaction.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                No transactions match your search criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibraryTransactions;