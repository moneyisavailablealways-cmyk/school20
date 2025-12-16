import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, DollarSign, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LibraryFine {
  id: string;
  borrower_id: string;
  transaction_id?: string;
  fine_type: string;
  amount: number;
  description?: string;
  is_paid: boolean;
  paid_date?: string;
  waived_date?: string;
  waived_by?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  library_transactions?: {
    library_items?: {
      title: string;
      barcode: string;
    };
  };
}

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
}

const LibraryFines = () => {
  const [fines, setFines] = useState<LibraryFine[]>([]);
  const [filteredFines, setFilteredFines] = useState<LibraryFine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isNewFineOpen, setIsNewFineOpen] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const { toast } = useToast();

  const [newFine, setNewFine] = useState({
    borrower_id: '',
    fine_type: 'overdue',
    amount: '',
    description: ''
  });

  const fineTypes = [
    { value: 'overdue', label: 'Overdue Fine' },
    { value: 'damage', label: 'Damage Fine' },
    { value: 'lost', label: 'Lost Item Fine' },
    { value: 'processing', label: 'Processing Fee' }
  ];

  useEffect(() => {
    fetchFines();
    fetchBorrowers();
  }, []);

  useEffect(() => {
    filterFines();
  }, [fines, searchQuery, statusFilter]);

  const fetchBorrowers = async () => {
    try {
      const { data, error } = await supabase
        .from('library_transactions')
        .select('borrower_id, profiles!library_transactions_borrower_id_fkey (id, first_name, last_name)')
        .not('borrower_id', 'is', null);

      if (error) throw error;

      // Get unique borrowers
      const uniqueBorrowers = new Map<string, Borrower>();
      data?.forEach((t: any) => {
        if (t.profiles && !uniqueBorrowers.has(t.profiles.id)) {
          uniqueBorrowers.set(t.profiles.id, {
            id: t.profiles.id,
            first_name: t.profiles.first_name,
            last_name: t.profiles.last_name
          });
        }
      });
      setBorrowers(Array.from(uniqueBorrowers.values()));
    } catch (error) {
      console.error('Failed to fetch borrowers:', error);
    }
  };

  const fetchFines = async () => {
    try {
      const { data, error } = await supabase
        .from('library_fines')
        .select(`
          *,
          profiles!library_fines_borrower_id_fkey (first_name, last_name, email),
          library_transactions (
            library_items (title, barcode)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFines(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch fines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterFines = () => {
    let filtered = fines;

    if (searchQuery) {
      filtered = filtered.filter(fine => 
        fine.profiles?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fine.profiles?.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fine.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fine.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(fine => {
        switch (statusFilter) {
          case 'unpaid':
            return !fine.is_paid && !fine.waived_date;
          case 'paid':
            return fine.is_paid;
          case 'waived':
            return !!fine.waived_date;
          default:
            return true;
        }
      });
    }

    setFilteredFines(filtered);
  };

  const handleNewFine = async () => {
    try {
      if (!newFine.borrower_id) {
        throw new Error('Please select a borrower');
      }

      const { error } = await supabase
        .from('library_fines')
        .insert([{
          borrower_id: newFine.borrower_id,
          fine_type: newFine.fine_type,
          amount: parseFloat(newFine.amount),
          description: newFine.description
        }]);

      if (error) throw error;

      toast({
        description: "Fine created successfully",
      });

      setIsNewFineOpen(false);
      setNewFine({
        borrower_id: '',
        fine_type: 'overdue',
        amount: '',
        description: ''
      });
      fetchFines();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayFine = async (fineId: string) => {
    try {
      const { error } = await supabase
        .from('library_fines')
        .update({
          is_paid: true,
          paid_date: new Date().toISOString()
        })
        .eq('id', fineId);

      if (error) throw error;

      toast({
        description: "Fine marked as paid",
      });

      fetchFines();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark fine as paid",
        variant: "destructive",
      });
    }
  };

  const handleWaiveFine = async (fineId: string) => {
    try {
      const { error } = await supabase
        .from('library_fines')
        .update({
          waived_date: new Date().toISOString()
        })
        .eq('id', fineId);

      if (error) throw error;

      toast({
        description: "Fine waived successfully",
      });

      fetchFines();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to waive fine",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (fine: LibraryFine) => {
    if (fine.waived_date) {
      return <Badge variant="outline">Waived</Badge>;
    }
    if (fine.is_paid) {
      return <Badge variant="secondary">Paid</Badge>;
    }
    return <Badge variant="destructive">Unpaid</Badge>;
  };

  const getTotalFines = () => {
    return fines.reduce((total, fine) => {
      if (!fine.is_paid && !fine.waived_date) {
        return total + fine.amount;
      }
      return total;
    }, 0);
  };

  const getCollectedAmount = () => {
    return fines.reduce((total, fine) => {
      if (fine.is_paid) {
        return total + fine.amount;
      }
      return total;
    }, 0);
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Fines</h2>
          <p className="text-muted-foreground">
            Manage library fines, payments, and waivers.
          </p>
        </div>
        <Dialog open={isNewFineOpen} onOpenChange={setIsNewFineOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Fine
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Fine</DialogTitle>
              <DialogDescription>
                Create a new fine for a library member.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="borrower_id">Select Borrower</Label>
                <Select value={newFine.borrower_id} onValueChange={(value) => setNewFine({...newFine, borrower_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a borrower" />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowers.map((borrower) => (
                      <SelectItem key={borrower.id} value={borrower.id}>
                        {borrower.first_name} {borrower.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fine_type">Fine Type</Label>
                <Select value={newFine.fine_type} onValueChange={(value) => setNewFine({...newFine, fine_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fineTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newFine.amount}
                  onChange={(e) => setNewFine({...newFine, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newFine.description}
                  onChange={(e) => setNewFine({...newFine, description: e.target.value})}
                  placeholder="Reason for fine"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleNewFine}>Add Fine</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fines.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalFines().toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getCollectedAmount().toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Fines</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fines.filter(f => !f.is_paid && !f.waived_date).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter Fines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by member name, email, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fines</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fines</CardTitle>
          <CardDescription>
            Showing {filteredFines.length} fine(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFines.map((fine) => (
                <TableRow key={fine.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {fine.profiles?.first_name} {fine.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{fine.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {fineTypes.find(t => t.value === fine.fine_type)?.label || fine.fine_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">${fine.amount.toFixed(2)}</TableCell>
                  <TableCell>{fine.description || '-'}</TableCell>
                  <TableCell>{format(new Date(fine.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(fine)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!fine.is_paid && !fine.waived_date && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePayFine(fine.id)}
                          >
                            Mark Paid
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleWaiveFine(fine.id)}
                          >
                            Waive
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredFines.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No fines found</h3>
              <p className="text-muted-foreground">
                No fines match your search criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibraryFines;