import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatUGX, MONTHS } from '@/lib/finance/format';
import { TrendingUp, TrendingDown, Wallet, Banknote, AlertTriangle, BellRing } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { toast } from 'sonner';
import { useState } from 'react';

const FinanceDashboard = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [sendingReminders, setSendingReminders] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const { data: filterOptions } = useQuery({
    queryKey: ['finance-filter-options', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [yearsRes, termsRes, classesRes] = await Promise.all([
        supabase.from('academic_years').select('id, name').eq('school_id', schoolId!).order('name', { ascending: false }),
        supabase.from('academic_terms').select('id, term_name, academic_year_id').eq('school_id', schoolId!),
        supabase.from('classes').select('id, name').eq('school_id', schoolId!).order('name'),
      ]);
      return {
        years: yearsRes.data || [],
        terms: termsRes.data || [],
        classes: classesRes.data || [],
      };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['finance-dashboard', schoolId, yearFilter, termFilter, classFilter],
    enabled: !!schoolId,
    queryFn: async () => {
      // Build invoice query with filters
      let invQuery = supabase.from('invoices')
        .select('id, total_amount, paid_amount, balance_amount, status, student_id, academic_year_id')
        .eq('school_id', schoolId!);
      if (yearFilter !== 'all') invQuery = invQuery.eq('academic_year_id', yearFilter);
      const invoicesRes = await invQuery;
      let invoices = invoicesRes.data || [];

      // Class filter -> restrict via student_enrollments
      if (classFilter !== 'all') {
        const studentIds = invoices.map(i => i.student_id).filter(Boolean);
        if (studentIds.length) {
          const { data: enrolls } = await supabase
            .from('student_enrollments')
            .select('student_id')
            .eq('class_id', classFilter)
            .eq('status', 'active')
            .in('student_id', studentIds as string[]);
          const allowed = new Set((enrolls || []).map(e => e.student_id));
          invoices = invoices.filter(i => i.student_id && allowed.has(i.student_id));
        } else {
          invoices = [];
        }
      }

      const invoiceIds = invoices.map(i => i.id);

      // Payments: only those tied to filtered invoices (when filters active) else all school payments via invoices link
      const { data: paymentsAll } = await supabase
        .from('payments').select('amount, payment_date, status, invoice_id')
        .eq('status', 'completed');
      const payments = (paymentsAll || []).filter(p => !p.invoice_id || invoiceIds.includes(p.invoice_id as string));

      // Salaries
      let salQ = supabase.from('salary_payments')
        .select('amount_paid, payment_date, status, pay_month, pay_year')
        .eq('school_id', schoolId!);
      const salaryRes = await salQ;
      const salaries = salaryRes.data || [];

      const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const outstanding = invoices.reduce((s, i) => s + Number(i.balance_amount || 0), 0);
      const totalSalaries = salaries.filter(s => s.status === 'paid').reduce((s, p) => s + Number(p.amount_paid || 0), 0);
      const netIncome = totalCollected - totalSalaries;

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

  const filteredTerms = (filterOptions?.terms || []).filter(t => yearFilter === 'all' || t.academic_year_id === yearFilter);

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading finance dashboard...</div>;

  const cards = [
    { title: 'Total Fees Collected', value: formatUGX(data.totalCollected), icon: Wallet, color: 'text-green-600' },
    { title: 'Outstanding Balances', value: formatUGX(data.outstanding), icon: AlertTriangle, color: 'text-orange-600' },
    { title: 'Salary Expenses', value: formatUGX(data.totalSalaries), icon: Banknote, color: 'text-blue-600' },
    { title: 'Net Income', value: formatUGX(data.netIncome), icon: data.netIncome >= 0 ? TrendingUp : TrendingDown, color: data.netIncome >= 0 ? 'text-green-600' : 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">Real-time view of fees, salaries, and net income</p>
        </div>
        <Button onClick={sendReminders} disabled={sendingReminders}>
          <BellRing className="h-4 w-4 mr-2" />{sendingReminders ? 'Sending...' : 'Send Fee Reminders'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Academic Year</Label>
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setTermFilter('all'); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {filterOptions?.years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Term</Label>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {filteredTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.term_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {filterOptions?.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
