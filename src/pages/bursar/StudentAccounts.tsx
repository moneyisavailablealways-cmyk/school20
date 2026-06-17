import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTermLabel } from '@/hooks/useTermLabel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUGX } from '@/lib/finance/format';
import { Search, Wallet, Plus, Receipt, Printer, AlertTriangle } from 'lucide-react';

const StudentAccounts = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const navigate = useNavigate();
  const { singular, plural } = useTermLabel();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: classes } = useQuery({
    queryKey: ['bursar-classes', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name').eq('school_id', schoolId!).order('name');
      return data || [];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ['student-fee-accounts', schoolId, classFilter],
    enabled: !!schoolId,
    queryFn: async () => {
      // Pull active enrollments + student profile
      let enrQ = supabase
        .from('student_enrollments')
        .select('student_id, class_id, classes(name), students!inner(id, student_id, profile_id, profiles!inner(first_name, last_name))')
        .eq('status', 'active');
      if (classFilter !== 'all') enrQ = enrQ.eq('class_id', classFilter);
      const { data: enrolls } = await enrQ;
      const list = (enrolls || []).filter((e: any) => e.students?.profile_id);

      const studentIds = list.map((e: any) => e.student_id);
      if (!studentIds.length) return [];

      const { data: invs } = await supabase
        .from('invoices')
        .select('student_id, total_amount, paid_amount, balance_amount, status')
        .in('student_id', studentIds)
        .eq('school_id', schoolId!);

      const totals = new Map<string, { req: number; paid: number; bal: number }>();
      (invs || []).forEach(i => {
        if (!i.student_id) return;
        const t = totals.get(i.student_id) || { req: 0, paid: 0, bal: 0 };
        t.req += Number(i.total_amount || 0);
        t.paid += Number(i.paid_amount || 0);
        t.bal += Number(i.balance_amount || 0);
        totals.set(i.student_id, t);
      });

      return list.map((e: any) => {
        const t = totals.get(e.student_id) || { req: 0, paid: 0, bal: 0 };
        return {
          student_id: e.student_id,
          name: `${e.students.profiles.first_name} ${e.students.profiles.last_name}`,
          student_number: e.students.student_id,
          class_name: e.classes?.name || '-',
          required: t.req,
          paid: t.paid,
          balance: t.bal,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (rows || []).filter(r => {
      const matchesSearch = !s || r.name.toLowerCase().includes(s) || (r.student_number || '').toLowerCase().includes(s);
      if (!matchesSearch) return false;
      if (statusFilter === 'defaulters') return r.balance > 0;
      if (statusFilter === 'cleared')    return r.balance <= 0 && r.required > 0;
      if (statusFilter === 'partial')    return r.paid > 0 && r.balance > 0;
      if (statusFilter === 'unpaid')     return r.paid === 0 && r.required > 0;
      return true;
    });
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.req += r.required; acc.paid += r.paid; acc.bal += r.balance;
        if (r.balance > 0) acc.defaulters += 1;
        return acc;
      },
      { req: 0, paid: 0, bal: 0, defaulters: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Wallet className="h-7 w-7" /> {singular} Fee Accounts</h1>
        <p className="text-muted-foreground">Required fees, total paid, and outstanding balance per {singular.toLowerCase()}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Required</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatUGX(totals.req)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatUGX(totals.paid)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{formatUGX(totals.bal)}</div></CardContent></Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'defaulters' ? 'border-red-500 bg-red-50/50' : 'hover:bg-muted/50'}`}
          onClick={() => setStatusFilter(statusFilter === 'defaulters' ? 'all' : 'defaulters')}
        >
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-600" /> Defaulters</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{totals.defaulters}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <CardTitle>{plural} Accounts</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder={`Search ${singular.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-full sm:w-64" />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {(classes || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="defaulters">Defaulters Only</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No {plural.toLowerCase()} accounts found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{singular}</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.student_id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.student_number}</TableCell>
                      <TableCell>{r.class_name}</TableCell>
                      <TableCell className="text-right">{formatUGX(r.required)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatUGX(r.paid)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatUGX(r.balance)}</TableCell>
                      <TableCell>
                        {r.balance <= 0 && r.required > 0 ? (
                          <Badge variant="default" className="bg-green-600">Cleared</Badge>
                        ) : r.paid > 0 ? (
                          <Badge variant="secondary">Partial</Badge>
                        ) : r.required > 0 ? (
                          <Badge variant="destructive">Unpaid</Badge>
                        ) : (
                          <Badge variant="outline">No Invoice</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" title="Add Payment" onClick={() => navigate('/bursar/payments/new')}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Generate Invoice" onClick={() => navigate('/bursar/invoices/create')}>
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Print Statement" onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAccounts;
