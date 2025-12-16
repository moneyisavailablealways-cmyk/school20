import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  FileText, 
  CreditCard, 
  Users, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';

const BursarDashboard = () => {
  const { profile } = useAuth();

  // Fetch financial metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['bursar-metrics'],
    queryFn: async () => {
      const [invoicesRes, paymentsRes, studentsRes] = await Promise.all([
        supabase.from('invoices').select('total_amount, paid_amount, balance_amount, status'),
        supabase.from('payments').select('amount, status').eq('status', 'completed'),
        supabase.from('students').select('id').eq('enrollment_status', 'active')
      ]);

      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const students = studentsRes.data || [];

      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0);
      const outstandingFees = invoices.reduce((sum, i) => sum + parseFloat(i.balance_amount?.toString() || '0'), 0);
      const monthlyCollection = totalRevenue; // Simplified for demo

      return {
        totalRevenue,
        outstandingFees,
        monthlyCollection,
        activeStudents: students.length
      };
    }
  });

  // Fetch recent payments
  const { data: recentPayments = [] } = useQuery({
    queryKey: ['recent-payments-dashboard'],
    queryFn: async () => {
      // Sequential fetch to avoid RLS join issues
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, amount, payment_method, payment_date, status, student_id')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      if (!payments || payments.length === 0) return [];

      // Get student IDs
      const studentIds = [...new Set(payments.map(p => p.student_id).filter(Boolean))];
      
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

      // Map data
      const studentMap = new Map((students || []).map(s => [s.id, s]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return payments.map(payment => {
        const student = studentMap.get(payment.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        return {
          ...payment,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          studentId: student?.student_id || ''
        };
      });
    }
  });

  // Fetch outstanding invoices
  const { data: outstandingInvoices = [] } = useQuery({
    queryKey: ['outstanding-invoices-dashboard'],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, balance_amount, due_date, student_id, status')
        .gt('balance_amount', 0)
        .neq('status', 'paid')
        .order('due_date', { ascending: true })
        .limit(4);

      if (error) throw error;
      if (!invoices || invoices.length === 0) return [];

      // Get student IDs
      const studentIds = [...new Set(invoices.map(i => i.student_id).filter(Boolean))];
      
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

      // Map data
      const studentMap = new Map((students || []).map(s => [s.id, s]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const now = new Date();
      return invoices.map(invoice => {
        const student = studentMap.get(invoice.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          ...invoice,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          studentId: student?.student_id || '',
          daysOverdue,
          priority: daysOverdue > 0 ? 'high' : (daysOverdue === 0 && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) ? 'medium' : 'low'
        };
      });
    }
  });

  // Fetch payment method summary
  const { data: paymentSummary = [] } = useQuery({
    queryKey: ['payment-summary-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method, amount')
        .eq('status', 'completed');

      if (error) throw error;

      const methodTotals: Record<string, number> = {};
      let total = 0;
      
      (data || []).forEach(payment => {
        const amount = parseFloat(payment.amount?.toString() || '0');
        methodTotals[payment.payment_method] = (methodTotals[payment.payment_method] || 0) + amount;
        total += amount;
      });

      const methodLabels: Record<string, string> = {
        cash: 'Cash',
        bank_transfer: 'Bank Transfer',
        card: 'Card',
        check: 'Check',
        mobile_money: 'Mobile Money'
      };

      return Object.entries(methodTotals).map(([method, amount]) => ({
        method: methodLabels[method] || method,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }));
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const financialMetrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Outstanding Fees',
      value: formatCurrency(metrics?.outstandingFees || 0),
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      title: 'Monthly Collection',
      value: formatCurrency(metrics?.monthlyCollection || 0),
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Active Students',
      value: metrics?.activeStudents?.toString() || '0',
      icon: Users,
      color: 'text-purple-600',
    },
  ];

  const quickActions = [
    {
      title: 'Generate Invoices',
      description: 'Create and send new invoices to students',
      icon: FileText,
      href: '/bursar/invoices/create',
      color: 'text-blue-600',
    },
    {
      title: 'Record Payment',
      description: 'Add new payment receipt',
      icon: CreditCard,
      href: '/bursar/payments',
      color: 'text-green-600',
    },
    {
      title: 'Fee Structures',
      description: 'Manage school fee structures',
      icon: DollarSign,
      href: '/bursar/fee-structures',
      color: 'text-purple-600',
    },
    {
      title: 'Financial Reports',
      description: 'Generate financial reports and exports',
      icon: Receipt,
      href: '/bursar/reports',
      color: 'text-orange-600',
    },
  ];

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, Bursar {profile?.last_name}</h1>
        <p className="text-muted-foreground">
          Financial overview and payment management dashboard
        </p>
      </div>

      {/* Financial Metrics */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Financial Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {financialMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <h3 className="font-medium">{action.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                <Button asChild size="sm" className="w-full">
                  <Link to={action.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Recent Payments</span>
            </CardTitle>
            <CardDescription>Latest payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No recent payments</p>
              ) : (
                recentPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{payment.studentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {payment.payment_method?.replace('_', ' ')} • {formatDate(payment.payment_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(parseFloat(payment.amount))}</div>
                      <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-3 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/bursar/payments">View All Payments</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span>Outstanding Invoices</span>
            </CardTitle>
            <CardDescription>Invoices requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outstandingInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No outstanding invoices</p>
              ) : (
                outstandingInvoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(invoice.priority)}`}>
                        {invoice.priority.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{invoice.studentName}</div>
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                          {invoice.daysOverdue > 0 && (
                            <span className="text-red-600 ml-1">({invoice.daysOverdue} days overdue)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(parseFloat(invoice.balance_amount))}</div>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-3 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/bursar/invoices">View All Invoices</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      {paymentSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collection Summary</CardTitle>
            <CardDescription>Revenue collection by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {paymentSummary.map((item: any) => (
                <div key={item.method} className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(item.amount)}</div>
                  <div className="text-sm text-muted-foreground">{item.method}</div>
                  <div className="text-xs text-muted-foreground">{item.percentage}% of total</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BursarDashboard;
