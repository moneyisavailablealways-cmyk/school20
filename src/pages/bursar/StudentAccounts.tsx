import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatUGX } from '@/lib/finance/format';
import { Search, Wallet } from 'lucide-react';

const StudentAccounts = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');

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
    return (rows || []).filter(r =>
      !s || r.name.toLowerCase().includes(s) || (r.student_number || '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.req += r.required; acc.paid += r.paid; acc.bal += r.balance;
        return acc;
      },
      { req: 0, paid: 0, bal: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Wallet className="h-7 w-7" /> Student Fee Accounts</h1>
        <p className="text-muted-foreground">Required fees, total paid, and outstanding balance per student</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Required</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatUGX(totals.req)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatUGX(totals.paid)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{formatUGX(totals.bal)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <CardTitle>Accounts</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-full sm:w-64" />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {(classes || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No student accounts found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
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
