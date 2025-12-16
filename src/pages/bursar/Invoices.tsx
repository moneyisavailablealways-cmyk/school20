import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Search, Eye, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

const Invoices = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Fetch invoices with sequential pattern to avoid RLS issues
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', searchTerm, selectedStatus],
    queryFn: async () => {
      // Fetch invoices
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data: invoicesData, error: invoicesError } = await query;
      if (invoicesError) throw invoicesError;
      if (!invoicesData || invoicesData.length === 0) return [];

      // Get unique student IDs
      const studentIds = [...new Set(invoicesData.map(i => i.student_id).filter(Boolean))];
      
      // Fetch students
      const { data: students } = await supabase
        .from('students')
        .select('id, student_id, profile_id')
        .in('id', studentIds);

      // Fetch profiles
      const profileIds = [...new Set((students || []).map(s => s.profile_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', profileIds);

      // Create lookup maps
      const studentMap = new Map((students || []).map(s => [s.id, s]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Combine data
      const combinedData = invoicesData.map(invoice => {
        const student = studentMap.get(invoice.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        return {
          ...invoice,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          studentIdNumber: student?.student_id || ''
        };
      });

      // Filter by search term
      if (searchTerm) {
        return combinedData.filter((invoice: any) => 
          invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.studentIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return combinedData;
    }
  });

  // Fetch invoice items for selected invoice
  const { data: invoiceItems = [] } = useQuery({
    queryKey: ['invoice-items', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return [];
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', selectedInvoice.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInvoice?.id
  });

  // Stats
  const stats = {
    total: invoices.length,
    pending: invoices.filter((i: any) => i.status === 'pending').length,
    paid: invoices.filter((i: any) => i.status === 'paid').length,
    overdue: invoices.filter((i: any) => new Date(i.due_date) < new Date() && i.status !== 'paid').length,
    totalAmount: invoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0),
    paidAmount: invoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0)
  };

  const getStatusBadgeVariant = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'paid';
    if (isOverdue) return 'destructive';
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'partially_paid': return 'outline';
      default: return 'secondary';
    }
  };

  const getDisplayStatus = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'paid';
    if (isOverdue) return 'Overdue';
    return status?.replace('_', ' ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Invoice Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage student invoices and billing
          </p>
        </div>
        <Button onClick={() => navigate('/bursar/invoices/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)} total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.paidAmount)} collected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number, student ID, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found. Click "Create Invoice" to generate a new invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.studentName}</div>
                          <div className="text-sm text-muted-foreground">{invoice.studentIdNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(Number(invoice.total_amount || 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(invoice.paid_amount || 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(invoice.balance_amount || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status, invoice.due_date)}>
                          {getDisplayStatus(invoice.status, invoice.due_date)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedInvoice.studentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.studentIdNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Invoice Items</h4>
                {invoiceItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No items found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold">{formatCurrency(Number(selectedInvoice.total_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="text-green-600">{formatCurrency(Number(selectedInvoice.paid_amount || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance:</span>
                  <span className="font-bold text-orange-600">{formatCurrency(Number(selectedInvoice.balance_amount))}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button onClick={() => {
                    setSelectedInvoice(null);
                    navigate('/bursar/payments');
                  }}>
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
