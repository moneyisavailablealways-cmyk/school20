import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, Download, DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Financial Summary Query
  const { data: financialSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financial-summary', selectedPeriod],
    queryFn: async () => {
      let dateFilter = '';
      const now = new Date();
      
      switch (selectedPeriod) {
        case 'current_month':
          dateFilter = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
          break;
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          dateFilter = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
          break;
        case 'current_year':
          dateFilter = `${now.getFullYear()}-01-01`;
          break;
      }

      const [invoicesResult, paymentsResult, scholarshipsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('total_amount, paid_amount, status, created_at')
          .gte('created_at', dateFilter),
        supabase
          .from('payments')
          .select('amount, payment_method, status, created_at')
          .eq('status', 'completed')
          .gte('created_at', dateFilter),
        supabase
          .from('student_scholarships')
          .select('amount, status, created_at')
          .eq('status', 'active')
          .gte('created_at', dateFilter)
      ]);

      return {
        invoices: invoicesResult.data || [],
        payments: paymentsResult.data || [],
        scholarships: scholarshipsResult.data || []
      };
    }
  });

  // Payment Methods Distribution
  const { data: paymentMethodsData = [] } = useQuery({
    queryKey: ['payment-methods-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method, amount')
        .eq('status', 'completed');

      if (error) throw error;

      const methods = (data || []).reduce((acc: any, payment: any) => {
        const method = payment.payment_method;
        if (!acc[method]) {
          acc[method] = { method, total: 0, count: 0 };
        }
        acc[method].total += Number(payment.amount);
        acc[method].count += 1;
        return acc;
      }, {});

      return Object.values(methods);
    }
  });

  // Monthly Revenue Trend
  const { data: monthlyRevenue = [] } = useQuery({
    queryKey: ['monthly-revenue', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', `${selectedYear}-01-01`)
        .lt('created_at', `${parseInt(selectedYear) + 1}-01-01`);

      if (error) throw error;

      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2000, i).toLocaleDateString('en', { month: 'short' }),
        revenue: 0,
        payments: 0
      }));

      (data || []).forEach((payment: any) => {
        const month = new Date(payment.created_at).getMonth();
        monthlyData[month].revenue += Number(payment.amount);
        monthlyData[month].payments += 1;
      });

      return monthlyData;
    }
  });

  // Outstanding Fees Report - using sequential fetching
  const { data: outstandingFees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['outstanding-fees-report'],
    queryFn: async () => {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('*')
        .neq('status', 'paid')
        .gt('balance_amount', 0)
        .order('due_date', { ascending: true });

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
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          studentIdNumber: student?.student_id || ''
        };
      });
    }
  });

  const totalInvoiceAmount = financialSummary?.invoices.reduce((sum: number, invoice: any) => 
    sum + Number(invoice.total_amount), 0) || 0;
  
  const totalPaidAmount = financialSummary?.payments.reduce((sum: number, payment: any) => 
    sum + Number(payment.amount), 0) || 0;
  
  const totalScholarships = financialSummary?.scholarships.reduce((sum: number, scholarship: any) => 
    sum + Number(scholarship.amount), 0) || 0;

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleExport = () => {
    // Create CSV data
    const csvData = outstandingFees.map((invoice: any) => ({
      'Invoice #': invoice.invoice_number,
      'Student': invoice.studentName,
      'Student ID': invoice.studentIdNumber,
      'Total Amount': invoice.total_amount,
      'Paid Amount': invoice.paid_amount || 0,
      'Balance': invoice.balance_amount,
      'Due Date': invoice.due_date,
      'Status': new Date(invoice.due_date) < new Date() ? 'Overdue' : invoice.status
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Financial Reports</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive financial analytics and reporting
          </p>
        </div>
        <Button onClick={handleExport} disabled={outstandingFees.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Report Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="current_year">Current Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvoiceAmount)}</div>
            <p className="text-xs text-muted-foreground">Total billed amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaidAmount)}</div>
            <p className="text-xs text-muted-foreground">Payments received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scholarships</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalScholarships)}</div>
            <p className="text-xs text-muted-foreground">Total awarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInvoiceAmount > 0 ? ((totalPaidAmount / totalInvoiceAmount) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Payment efficiency</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment Analysis</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No payment data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percent }: any) => `${method?.replace('_', ' ')} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {paymentMethodsData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No payment data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethodsData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payment data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Transaction Count</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Average Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodsData.map((method: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="capitalize">
                          {method.method?.replace('_', ' ')}
                        </TableCell>
                        <TableCell>{method.count}</TableCell>
                        <TableCell>{formatCurrency(method.total)}</TableCell>
                        <TableCell>{formatCurrency(method.total / method.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Outstanding Fees Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : outstandingFees.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No outstanding fees</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingFees.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.studentName}</div>
                            <div className="text-sm text-muted-foreground">{invoice.studentIdNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(invoice.total_amount))}</TableCell>
                        <TableCell>{formatCurrency(Number(invoice.paid_amount || 0))}</TableCell>
                        <TableCell>{formatCurrency(Number(invoice.balance_amount))}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            new Date(invoice.due_date) < new Date() ? 'destructive' :
                            invoice.status === 'pending' ? 'secondary' : 'outline'
                          }>
                            {new Date(invoice.due_date) < new Date() ? 'Overdue' : invoice.status?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
