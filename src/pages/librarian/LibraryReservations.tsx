import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Calendar, User, BookOpen, CheckCircle, XCircle, Clock, AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  barcode: string | null;
  item_type: string;
  subject: string | null;
  available_copies: number;
  total_copies: number;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface LibraryReservation {
  id: string;
  library_item_id: string;
  reserver_id: string;
  reservation_date: string;
  expiry_date: string;
  status: string;
  notes?: string;
  queue_position: number;
  hold_until?: string;
  notified_at?: string;
  fulfilled_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  library_items?: LibraryItem;
  profiles?: Profile;
}

const LibraryReservations = () => {
  const [reservations, setReservations] = useState<LibraryReservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<LibraryReservation[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  
  const [loading, setLoading] = useState(true);
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [isQueueDialogOpen, setIsQueueDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<LibraryItem | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<LibraryReservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [bookQueue, setBookQueue] = useState<LibraryReservation[]>([]);
  
  const { toast } = useToast();

  const [newReservation, setNewReservation] = useState({
    library_item_id: '',
    reserver_id: '',
    notes: ''
  });

  // Get unique values for filters
  const itemTypes = [...new Set(libraryItems.map(item => item.item_type))];
  const subjects = [...new Set(libraryItems.map(item => item.subject).filter(Boolean))];
  const authors = [...new Set(libraryItems.map(item => item.author).filter(Boolean))];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterReservations();
  }, [reservations, searchQuery, statusFilter, itemTypeFilter, authorFilter, subjectFilter]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchReservations(), fetchLibraryItems(), fetchStudents()]);
    setLoading(false);
  };

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('library_reservations')
        .select(`
          *,
          library_items (id, title, author, barcode, item_type, subject, available_copies, total_copies),
          profiles!library_reservations_reserver_id_fkey (id, first_name, last_name, email)
        `)
        .order('reservation_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reservations",
        variant: "destructive",
      });
    }
  };

  const fetchLibraryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('library_items')
        .select('id, title, author, barcode, item_type, subject, available_copies, total_copies')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setLibraryItems(data || []);
    } catch (error) {
      console.error('Error fetching library items:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('role', ['student', 'teacher'])
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const filterReservations = useCallback(() => {
    let filtered = reservations;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation => 
        reservation.library_items?.title?.toLowerCase().includes(query) ||
        reservation.library_items?.barcode?.toLowerCase().includes(query) ||
        reservation.profiles?.first_name?.toLowerCase().includes(query) ||
        reservation.profiles?.last_name?.toLowerCase().includes(query) ||
        reservation.profiles?.email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === statusFilter);
    }

    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(reservation => 
        reservation.library_items?.item_type === itemTypeFilter
      );
    }

    if (authorFilter) {
      filtered = filtered.filter(reservation => 
        reservation.library_items?.author?.toLowerCase().includes(authorFilter.toLowerCase())
      );
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(reservation => 
        reservation.library_items?.subject === subjectFilter
      );
    }

    setFilteredReservations(filtered);
  }, [reservations, searchQuery, statusFilter, itemTypeFilter, authorFilter, subjectFilter]);

  const handleNewReservation = async () => {
    if (!newReservation.library_item_id || !newReservation.reserver_id) {
      toast({
        title: "Error",
        description: "Please select a book and a member",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_library_reservation', {
        p_library_item_id: newReservation.library_item_id,
        p_reserver_id: newReservation.reserver_id,
        p_notes: newReservation.notes || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string; queue_position?: number };
      
      if (!result.success) {
        toast({
          title: "Cannot Reserve",
          description: result.error || "Failed to create reservation",
          variant: "destructive",
        });
        return;
      }

      toast({
        description: result.message || "Reservation created successfully",
      });

      setIsNewReservationOpen(false);
      setNewReservation({ library_item_id: '', reserver_id: '', notes: '' });
      fetchReservations();
      fetchLibraryItems();
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create reservation",
        variant: "destructive",
      });
    }
  };

  const handleFulfill = async (reservationId: string) => {
    try {
      const { data, error } = await supabase.rpc('fulfill_library_reservation', {
        p_reservation_id: reservationId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to fulfill reservation",
          variant: "destructive",
        });
        return;
      }

      toast({ description: "Reservation fulfilled successfully" });
      fetchReservations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fulfill reservation",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (!selectedReservation) return;

    try {
      const { data, error } = await supabase.rpc('cancel_library_reservation', {
        p_reservation_id: selectedReservation.id,
        p_reason: cancelReason || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel reservation",
          variant: "destructive",
        });
        return;
      }

      toast({ description: "Reservation cancelled" });
      setIsCancelDialogOpen(false);
      setSelectedReservation(null);
      setCancelReason('');
      fetchReservations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel reservation",
        variant: "destructive",
      });
    }
  };

  const openQueueDialog = async (book: LibraryItem) => {
    setSelectedBook(book);
    
    // Fetch queue for this book
    const { data, error } = await supabase
      .from('library_reservations')
      .select(`
        *,
        profiles!library_reservations_reserver_id_fkey (id, first_name, last_name, email)
      `)
      .eq('library_item_id', book.id)
      .in('status', ['waiting', 'ready', 'active'])
      .order('queue_position');

    if (!error && data) {
      setBookQueue(data);
    }
    
    setIsQueueDialogOpen(true);
  };

  const openCancelDialog = (reservation: LibraryReservation) => {
    setSelectedReservation(reservation);
    setIsCancelDialogOpen(true);
  };

  const processExpiry = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-reservation-expiry');
      
      if (error) throw error;

      toast({
        description: `Processed ${data.expired_count || 0} expired reservations`,
      });
      fetchReservations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process expiry",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, holdUntil?: string) => {
    const isHoldExpiring = holdUntil && new Date(holdUntil) < new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Waiting</Badge>;
      case 'ready':
        return (
          <Badge variant="default" className={isHoldExpiring ? 'bg-yellow-500' : 'bg-green-500'}>
            <CheckCircle className="h-3 w-3 mr-1" /> Ready for Pickup
          </Badge>
        );
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

  const getBookAvailabilityBadge = (item: LibraryItem) => {
    if (item.available_copies === 0) {
      return <Badge variant="destructive">Unavailable</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">{item.available_copies} available</Badge>;
  };

  // Check if book can be reserved (only when unavailable)
  const canReserve = (item: LibraryItem) => item.available_copies === 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeCount = reservations.filter(r => r.status === 'waiting' || r.status === 'ready' || r.status === 'active').length;
  const readyCount = reservations.filter(r => r.status === 'ready').length;
  const waitingCount = reservations.filter(r => r.status === 'waiting').length;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Reservations</h2>
          <p className="text-muted-foreground">
            Manage book reservations and waiting lists.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={processExpiry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Process Expiry
          </Button>
          <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Reservation</DialogTitle>
                <DialogDescription>
                  Reserve a book for a library member. Note: Only unavailable books can be reserved.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="book">Select Book</Label>
                  <Select 
                    value={newReservation.library_item_id} 
                    onValueChange={(value) => setNewReservation({...newReservation, library_item_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search and select a book..." />
                    </SelectTrigger>
                    <SelectContent>
                      {libraryItems.map((item) => (
                        <SelectItem 
                          key={item.id} 
                          value={item.id}
                          disabled={!canReserve(item)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{item.title} {item.author ? `- ${item.author}` : ''}</span>
                            {item.available_copies > 0 ? (
                              <span className="text-xs text-green-600 ml-2">(Available - Cannot Reserve)</span>
                            ) : (
                              <span className="text-xs text-red-600 ml-2">(Unavailable - Can Reserve)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only unavailable books can be reserved. Available books should be borrowed directly.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="member">Select Member</Label>
                  <Select 
                    value={newReservation.reserver_id} 
                    onValueChange={(value) => setNewReservation({...newReservation, reserver_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search and select a member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newReservation.notes}
                    onChange={(e) => setNewReservation({...newReservation, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewReservationOpen(false)}>Cancel</Button>
                <Button onClick={handleNewReservation}>Create Reservation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Active Queue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{readyCount}</div>
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
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, barcode, or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="ready">Ready for Pickup</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {itemTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject!}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filter by author..."
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
            />
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
                <TableHead>Queue #</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Reserved Date</TableHead>
                <TableHead>Hold Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>
                    {['waiting', 'ready', 'active'].includes(reservation.status) ? (
                      <Badge variant="outline" className="font-mono">#{reservation.queue_position}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reservation.library_items?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.library_items?.author || 'Unknown author'}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{reservation.library_items?.item_type}</Badge>
                        {reservation.library_items && getBookAvailabilityBadge(reservation.library_items)}
                      </div>
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
                  <TableCell>
                    {format(new Date(reservation.reservation_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {reservation.hold_until ? (
                      <div className={new Date(reservation.hold_until) < new Date() ? 'text-destructive' : ''}>
                        {format(new Date(reservation.hold_until), 'MMM dd, HH:mm')}
                        {new Date(reservation.hold_until) < new Date() && (
                          <AlertTriangle className="h-3 w-3 inline ml-1" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(reservation.status, reservation.hold_until)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {reservation.library_items && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openQueueDialog(reservation.library_items!)}
                          title="View queue for this book"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      )}
                      {['waiting', 'ready', 'active'].includes(reservation.status) && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleFulfill(reservation.id)}
                          >
                            Fulfill
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openCancelDialog(reservation)}
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

      {/* Queue Dialog */}
      <Dialog open={isQueueDialogOpen} onOpenChange={setIsQueueDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reservation Queue</DialogTitle>
            <DialogDescription>
              {selectedBook?.title} - Queue of waiting members
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {bookQueue.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reserved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookQueue.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <Badge variant="outline">#{res.queue_position}</Badge>
                      </TableCell>
                      <TableCell>
                        {res.profiles?.first_name} {res.profiles?.last_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(res.status, res.hold_until)}</TableCell>
                      <TableCell>{format(new Date(res.reservation_date), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">No active reservations for this book</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQueueDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reservation?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancelReason">Reason (Optional)</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCancelDialogOpen(false);
              setSelectedReservation(null);
              setCancelReason('');
            }}>
              Keep Reservation
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryReservations;
