import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CreditCard, Plus, Search, DollarSign } from 'lucide-react';

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      invoice_id: '',
      amount: '',
      payment_method: '',
      payment_reference: '',
      notes: ''
    }
  });

  // Fetch payments with sequential pattern
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', searchTerm, selectedMethod],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedMethod !== 'all') {
        query = query.eq('payment_method', selectedMethod);
      }

      const { data: paymentsData, error } = await query;
      if (error) throw error;
      if (!paymentsData || paymentsData.length === 0) return [];

      // Get unique student IDs
      const studentIds = [...new Set(paymentsData.map(p => p.student_id).filter(Boolean))];
      const invoiceIds = [...new Set(paymentsData.map(p => p.invoice_id).filter(Boolean))];
      
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

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount')
        .in('id', invoiceIds);

      // Create lookup maps
      const studentMap = new Map((students || []).map(s => [s.id, s]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const invoiceMap = new Map((invoices || []).map(i => [i.id, i]));

      // Combine data
      const combinedData = paymentsData.map(payment => {
        const student = studentMap.get(payment.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        const invoice = invoiceMap.get(payment.invoice_id);
        return {
          ...payment,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          studentIdNumber: student?.student_id || '',
          invoiceNumber: invoice?.invoice_number || 'N/A'
        };
      });

      // Filter by search term
      if (searchTerm) {
        return combinedData.filter((payment: any) => 
          payment.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.studentIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return combinedData;
    }
  });

  // Fetch pending invoices for the payment form
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ['pending-invoices'],
    queryFn: async () => {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, student_id, total_amount, balance_amount')
        .neq('status', 'paid')
        .gt('balance_amount', 0);
      
      if (error) throw error;
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

      return invoicesData.map(invoice => {
        const student = studentMap.get(invoice.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        return {
          ...invoice,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student'
        };
      });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Get student_id from the selected invoice
      const selectedInvoice = pendingInvoices.find((inv: any) => inv.id === data.invoice_id);
      if (!selectedInvoice) {
        throw new Error('Invoice not found. Please select a valid invoice.');
      }

      const paymentAmount = parseFloat(data.amount);
      const invoiceBalance = Number(selectedInvoice.balance_amount);
      
      // Validate payment amount
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Please enter a valid payment amount.');
      }

      if (paymentAmount > invoiceBalance) {
        throw new Error(`Payment amount ($${paymentAmount.toFixed(2)}) exceeds invoice balance ($${invoiceBalance.toFixed(2)})`);
      }

      const { error } = await supabase
        .from('payments')
        .insert({
          student_id: selectedInvoice.student_id,
          invoice_id: data.invoice_id,
          amount: paymentAmount,
          payment_method: data.payment_method,
          payment_reference: data.payment_reference,
          notes: data.notes || null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bursar-metrics'] });
      setIsCreateOpen(false);
      form.reset();
      toast.success('Payment recorded successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record payment');
      console.error('Error creating payment:', error);
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const onSubmit = (data: any) => {
    createPaymentMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalPayments = payments.reduce((sum, payment: any) => sum + Number(payment.amount || 0), 0);
  const completedPayments = payments.filter((p: any) => p.status === 'completed');
  const totalCompleted = completedPayments.reduce((sum, payment: any) => sum + Number(payment.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Payment Management</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage student payments
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="invoice_id"
                  rules={{ required: 'Please select an invoice' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select invoice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pendingInvoices.length === 0 ? (
                            <SelectItem value="none" disabled>No pending invoices</SelectItem>
                          ) : (
                            pendingInvoices.map((invoice: any) => (
                              <SelectItem key={invoice.id} value={invoice.id}>
                                {invoice.invoice_number} - {invoice.studentName} 
                                (Balance: {formatCurrency(Number(invoice.balance_amount))})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  rules={{ 
                    required: 'Amount is required', 
                    min: { value: 0.01, message: 'Amount must be positive' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="payment_method"
                  rules={{ required: 'Payment method is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="payment_reference"
                  rules={{ required: 'Payment reference is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Receipt number, transaction ID, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPaymentMutation.isPending}>
                    {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
            <p className="text-xs text-muted-foreground">All payments recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCompleted)}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Count</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
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
                  placeholder="Search by reference, student ID, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
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
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payments found. Click "Record Payment" to add a new payment.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_reference}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.studentName}</div>
                          <div className="text-sm text-muted-foreground">{payment.studentIdNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.invoiceNumber}</TableCell>
                      <TableCell>{formatCurrency(Number(payment.amount))}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
