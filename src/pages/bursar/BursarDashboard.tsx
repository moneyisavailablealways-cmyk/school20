import React from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';

const BursarDashboard = () => {
  const { profile } = useAuth();

  const financialMetrics = [
    {
      title: 'Total Revenue',
      value: '$234,567',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Outstanding Fees',
      value: '$45,890',
      change: '-8.2%',
      trend: 'down',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      title: 'Monthly Collection',
      value: '$89,234',
      change: '+15.3%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Active Students',
      value: '1,247',
      change: '+5.2%',
      trend: 'up',
      icon: Users,
      color: 'text-purple-600',
    },
  ];

  const recentPayments = [
    {
      student: 'John Smith - Grade 10A',
      amount: '$1,250',
      method: 'Bank Transfer',
      date: 'Today',
      status: 'completed',
    },
    {
      student: 'Sarah Johnson - Grade 11B',
      amount: '$875',
      method: 'Online Payment',
      date: 'Yesterday',
      status: 'completed',
    },
    {
      student: 'Michael Brown - Grade 9C',
      amount: '$1,100',
      method: 'Cash',
      date: '2 days ago',
      status: 'completed',
    },
    {
      student: 'Emily Davis - Grade 12A',
      amount: '$950',
      method: 'Mobile Money',
      date: '3 days ago',
      status: 'pending',
    },
  ];

  const outstandingInvoices = [
    {
      student: 'David Wilson - Grade 10B',
      amount: '$1,450',
      dueDate: 'Tomorrow',
      daysOverdue: 0,
      priority: 'high',
    },
    {
      student: 'Lisa Anderson - Grade 11A',
      amount: '$1,200',
      dueDate: 'Next Week',
      daysOverdue: 0,
      priority: 'medium',
    },
    {
      student: 'James Taylor - Grade 9A',
      amount: '$890',
      dueDate: '5 days overdue',
      daysOverdue: 5,
      priority: 'high',
    },
    {
      student: 'Maria Garcia - Grade 12B',
      amount: '$1,050',
      dueDate: '2 days overdue',
      daysOverdue: 2,
      priority: 'high',
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
      href: '/bursar/payments/new',
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

  const formatCurrency = (amount: string) => {
    return amount;
  };

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
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {metric.change}
                  </span>
                  <span>from last month</span>
                </div>
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
              {recentPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{payment.student}</div>
                    <div className="text-sm text-muted-foreground">{payment.method} • {payment.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{payment.amount}</div>
                    <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
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
              {outstandingInvoices.map((invoice, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(invoice.priority)}`}>
                      {invoice.priority.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{invoice.student}</div>
                      <div className="text-sm text-muted-foreground">
                        Due: {invoice.dueDate}
                        {invoice.daysOverdue > 0 && (
                          <span className="text-red-600 ml-1">({invoice.daysOverdue} days overdue)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{invoice.amount}</div>
                  </div>
                </div>
              ))}
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
      <Card>
        <CardHeader>
          <CardTitle>Monthly Collection Summary</CardTitle>
          <CardDescription>Revenue collection by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { method: 'Bank Transfer', amount: '$45,230', percentage: 51 },
              { method: 'Cash', amount: '$28,560', percentage: 32 },
              { method: 'Online Payment', amount: '$12,340', percentage: 14 },
              { method: 'Mobile Money', amount: '$2,104', percentage: 2 },
              { method: 'Cheque', amount: '$890', percentage: 1 },
            ].map((item) => (
              <div key={item.method} className="text-center">
                <div className="text-2xl font-bold">{item.amount}</div>
                <div className="text-sm text-muted-foreground">{item.method}</div>
                <div className="text-xs text-muted-foreground">{item.percentage}% of total</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BursarDashboard;