import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calendar, User, BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LibraryReservation {
  id: string;
  library_item_id: string;
  reserver_id: string;
  reservation_date: string;
  expiry_date: string;
  status: string;
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

const LibraryReservations = () => {
  const [reservations, setReservations] = useState<LibraryReservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<LibraryReservation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const { toast } = useToast();

  const [newReservation, setNewReservation] = useState({
    barcode: '',
    reserver_email: '',
    expiry_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    filterReservations();
  }, [reservations, searchQuery, statusFilter]);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('library_reservations')
        .select(`
          *,
          library_items (title, author, barcode),
          profiles!library_reservations_reserver_id_fkey (first_name, last_name, email)
        `)
        .order('reservation_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch reservations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReservations = () => {
    let filtered = reservations;

    if (searchQuery) {
      filtered = filtered.filter(reservation => 
        reservation.library_items?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.library_items?.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.profiles?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.profiles?.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === statusFilter);
    }

    setFilteredReservations(filtered);
  };

  const handleNewReservation = async () => {
    try {
      // Find library item by barcode
      const { data: libraryItem, error: itemError } = await supabase
        .from('library_items')
        .select('id')
        .eq('barcode', newReservation.barcode)
        .single();

      if (itemError) throw new Error('Library item not found');

      // Find reserver by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newReservation.reserver_email)
        .single();

      if (profileError) throw new Error('User not found');

      const { error } = await supabase
        .from('library_reservations')
        .insert([{
          library_item_id: libraryItem.id,
          reserver_id: profile.id,
          expiry_date: newReservation.expiry_date,
          notes: newReservation.notes,
          status: 'active'
        }]);

      if (error) throw error;

      toast({
        description: "Reservation created successfully",
      });

      setIsNewReservationOpen(false);
      setNewReservation({
        barcode: '',
        reserver_email: '',
        expiry_date: '',
        notes: ''
      });
      fetchReservations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('library_reservations')
        .update({ status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        description: `Reservation ${newStatus} successfully`,
      });

      fetchReservations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reservation",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'fulfilled':
        return <Badge variant="secondary">Fulfilled</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Reservations</h2>
          <p className="text-muted-foreground">
            Manage book reservations and waiting lists.
          </p>
        </div>
        <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Reservation</DialogTitle>
              <DialogDescription>
                Reserve a book for a library member.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="barcode">Book Barcode</Label>
                <Input
                  id="barcode"
                  value={newReservation.barcode}
                  onChange={(e) => setNewReservation({...newReservation, barcode: e.target.value})}
                  placeholder="Enter book barcode"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reserver_email">Member Email</Label>
                <Input
                  id="reserver_email"
                  value={newReservation.reserver_email}
                  onChange={(e) => setNewReservation({...newReservation, reserver_email: e.target.value})}
                  placeholder="Enter member email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={newReservation.expiry_date}
                  onChange={(e) => setNewReservation({...newReservation, expiry_date: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newReservation.notes}
                  onChange={(e) => setNewReservation({...newReservation, notes: e.target.value})}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleNewReservation}>Create Reservation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservations.filter(r => r.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservations.filter(r => r.status === 'fulfilled').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservations.filter(r => r.status === 'expired' || isExpired(r.expiry_date)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by book title, barcode, or member..."
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
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>
            Showing {filteredReservations.length} reservation(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Reserved Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reservation.library_items?.title}</p>
                      <p className="text-sm text-muted-foreground">{reservation.library_items?.barcode}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {reservation.profiles?.first_name} {reservation.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{reservation.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(reservation.reservation_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <div className={isExpired(reservation.expiry_date) && reservation.status === 'active' ? 'text-destructive' : ''}>
                      {format(new Date(reservation.expiry_date), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                  <TableCell>{reservation.notes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {reservation.status === 'active' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusUpdate(reservation.id, 'fulfilled')}
                          >
                            Fulfill
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusUpdate(reservation.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredReservations.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No reservations found</h3>
              <p className="text-muted-foreground">
                No reservations match your search criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibraryReservations;