import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, Calendar, FileText, User, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string;
  issued_date: string;
  status: string;
  notes: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_reference: string;
  status: string;
  notes: string;
  invoice_id: string;
}

interface Student {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const FeesPayments = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  useEffect(() => {
    fetchChildren();
  }, [profile]);

  useEffect(() => {
    if (selectedChild) {
      fetchInvoices();
      fetchPayments();
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('parent_student_relationships')
        .select(`
          student_id,
          students!inner (
            id,
            profiles!inner (
              first_name,
              last_name
            )
          )
        `)
        .eq('parent_id', profile.id);

      if (error) throw error;

      const childrenData = data?.map(rel => rel.students).filter(Boolean) || [];
      setChildren(childrenData as Student[]);
      
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children information');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!selectedChild) return;
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', selectedChild)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const fetchPayments = async () => {
    if (!selectedChild) return;
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', selectedChild)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Partially Paid</Badge>;
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalOutstanding = () => {
    return invoices.reduce((total, invoice) => total + invoice.balance_amount, 0);
  };

  const getTotalPaid = () => {
    return payments.reduce((total, payment) => 
      payment.status === 'completed' ? total + payment.amount : total, 0
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded w-64"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Fees & Payments</h1>
        <p className="text-muted-foreground">Manage your child's school fees and payment history</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No Children Found</p>
            <p className="text-muted-foreground text-center">
              No children are associated with your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.profiles.first_name} {child.profiles.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalOutstanding())}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <CreditCard className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalPaid())}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoices.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <div className="flex space-x-2">
              <Button
                variant={activeTab === 'invoices' ? 'default' : 'outline'}
                onClick={() => setActiveTab('invoices')}
              >
                Invoices
              </Button>
              <Button
                variant={activeTab === 'payments' ? 'default' : 'outline'}
                onClick={() => setActiveTab('payments')}
              >
                Payments
              </Button>
            </div>
          </div>

          {activeTab === 'invoices' ? (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold mb-2">No Invoices Found</p>
                    <p className="text-muted-foreground text-center">
                      No invoices are available for the selected child.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Invoice #{invoice.invoice_number}
                          </CardTitle>
                          <CardDescription>
                            Issued: {new Date(invoice.issued_date).toLocaleDateString()} • 
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold">{formatCurrency(invoice.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(invoice.paid_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Balance</p>
                          <p className="text-lg font-bold text-red-600">{formatCurrency(invoice.balance_amount)}</p>
                        </div>
                      </div>
                      
                      {invoice.notes && (
                        <div className="p-3 bg-muted rounded-lg mb-4">
                          <p className="text-sm">{invoice.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        {invoice.balance_amount > 0 && (
                          <Button size="sm">
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {payments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold mb-2">No Payments Found</p>
                    <p className="text-muted-foreground text-center">
                      No payment records are available for the selected child.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment #{payment.payment_reference}
                          </CardTitle>
                          <CardDescription>
                            {new Date(payment.payment_date).toLocaleDateString()} • 
                            {payment.payment_method}
                          </CardDescription>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Amount</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                          <p className="text-lg">{payment.payment_method}</p>
                        </div>
                      </div>
                      
                      {payment.notes && (
                        <div className="p-3 bg-muted rounded-lg mb-4">
                          <p className="text-sm">{payment.notes}</p>
                        </div>
                      )}

                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Download Receipt
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FeesPayments;