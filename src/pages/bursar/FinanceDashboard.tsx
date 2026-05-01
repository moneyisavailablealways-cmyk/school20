import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatUGX, MONTHS } from '@/lib/finance/format';
import { TrendingUp, TrendingDown, Wallet, Banknote, AlertTriangle, BellRing } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { toast } from 'sonner';
import { useState } from 'react';

const FinanceDashboard = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [sendingReminders, setSendingReminders] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['finance-dashboard', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [paymentsRes, invoicesRes, salaryRes] = await Promise.all([
        supabase.from('payments').select('amount, payment_date, status').eq('status', 'completed'),
        supabase.from('invoices').select('total_amount, paid_amount, balance_amount, status'),
        supabase.from('salary_payments').select('amount_paid, payment_date, status, pay_month, pay_year').eq('school_id', schoolId!),
      ]);

      const payments = paymentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const salaries = salaryRes.data || [];

      const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const outstanding = invoices.reduce((s, i) => s + Number(i.balance_amount || 0), 0);
      const totalSalaries = salaries.filter(s => s.status === 'paid').reduce((s, p) => s + Number(p.amount_paid || 0), 0);
      const netIncome = totalCollected - totalSalaries;

      // monthly trend (last 6 months)
      const now = new Date();
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        months.push({ key, label: MONTHS[d.getMonth()].slice(0,3), income: 0, salary: 0 });
      }
      const monthMap = new Map(months.map(m => [m.key, m]));
      payments.forEach(p => {
        if (!p.payment_date) return;
        const d = new Date(p.payment_date);
        const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const m = monthMap.get(k);
        if (m) m.income += Number(p.amount || 0);
      });
      salaries.forEach(s => {
        if (s.status !== 'paid') return;
        const k = `${s.pay_year}-${s.pay_month}`;
        const m = monthMap.get(k);
        if (m) m.salary += Number(s.amount_paid || 0);
      });

      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const partial = invoices.filter(i => i.status === 'partially_paid').length;
      const pending = invoices.filter(i => i.status === 'pending').length;

      return {
        totalCollected, outstanding, totalSalaries, netIncome,
        trend: months,
        invoiceStatus: [
          { name: 'Paid', value: paidInvoices },
          { name: 'Partial', value: partial },
          { name: 'Pending', value: pending },
        ],
      };
    },
  });

  const sendReminders = async () => {
    setSendingReminders(true);
    const { data: res, error } = await supabase.functions.invoke('send-fee-reminders', { body: { school_id: schoolId } });
    setSendingReminders(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sent ${res?.sent || 0} reminders`);
  };

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading finance dashboard...</div>;

  const cards = [
    { title: 'Total Fees Collected', value: formatUGX(data.totalCollected), icon: Wallet, color: 'text-green-600' },
    { title: 'Outstanding Balances', value: formatUGX(data.outstanding), icon: AlertTriangle, color: 'text-orange-600' },
    { title: 'Salary Expenses', value: formatUGX(data.totalSalaries), icon: Banknote, color: 'text-blue-600' },
    { title: 'Net Income', value: formatUGX(data.netIncome), icon: data.netIncome >= 0 ? TrendingUp : TrendingDown, color: data.netIncome >= 0 ? 'text-green-600' : 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">Real-time view of fees, salaries, and net income</p>
        </div>
        <Button onClick={sendReminders} disabled={sendingReminders}>
          <BellRing className="h-4 w-4 mr-2" />{sendingReminders ? 'Sending...' : 'Send Fee Reminders'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(c => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income vs Salary Expenses</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatUGX(v)} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" name="Income" />
                <Line type="monotone" dataKey="salary" stroke="hsl(var(--destructive))" name="Salaries" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Breakdown</CardTitle>
            <CardDescription>Current invoice statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.invoiceStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
