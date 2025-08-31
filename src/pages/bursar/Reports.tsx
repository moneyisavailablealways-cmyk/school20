import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, Download, Calendar, DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Financial Summary Query
  const { data: financialSummary } = useQuery({
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
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method, amount')
        .eq('status', 'completed');

      if (error) throw error;

      const methods = data.reduce((acc: any, payment: any) => {
        const method = payment.payment_method;
        if (!acc[method]) {
          acc[method] = { method, total: 0, count: 0 };
        }
        acc[method].total += parseFloat(payment.amount);
        acc[method].count += 1;
        return acc;
      }, {});

      return Object.values(methods);
    }
  });

  // Monthly Revenue Trend
  const { data: monthlyRevenue } = useQuery({
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

      data.forEach((payment: any) => {
        const month = new Date(payment.created_at).getMonth();
        monthlyData[month].revenue += parseFloat(payment.amount);
        monthlyData[month].payments += 1;
      });

      return monthlyData;
    }
  });

  // Outstanding Fees Report
  const { data: outstandingFees } = useQuery({
    queryKey: ['outstanding-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          students!inner(
            student_id,
            profiles!inner(first_name, last_name)
          )
        `)
        .neq('status', 'paid')
        .gt('balance_amount', 0)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const totalInvoiceAmount = financialSummary?.invoices.reduce((sum: number, invoice: any) => 
    sum + parseFloat(invoice.total_amount), 0) || 0;
  
  const totalPaidAmount = financialSummary?.payments.reduce((sum: number, payment: any) => 
    sum + parseFloat(payment.amount), 0) || 0;
  
  const totalScholarships = financialSummary?.scholarships.reduce((sum: number, scholarship: any) => 
    sum + parseFloat(scholarship.amount), 0) || 0;

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Financial Reports</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive financial analytics and reporting
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Reports
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
            <div className="text-2xl font-bold">${totalInvoiceAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total billed amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Payments received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scholarships</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalScholarships.toFixed(2)}</div>
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percent }: any) => `${method} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {paymentMethodsData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
                  {paymentMethodsData?.map((method: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="capitalize">
                        {method.method.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{method.count}</TableCell>
                      <TableCell>${method.total.toFixed(2)}</TableCell>
                      <TableCell>${(method.total / method.count).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  {outstandingFees?.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {invoice.students?.profiles?.first_name} {invoice.students?.profiles?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.students?.student_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>${parseFloat(invoice.total_amount).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(invoice.paid_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(invoice.balance_amount).toFixed(2)}</TableCell>
                      <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          new Date(invoice.due_date) < new Date() ? 'destructive' :
                          invoice.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {new Date(invoice.due_date) < new Date() ? 'Overdue' : invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;