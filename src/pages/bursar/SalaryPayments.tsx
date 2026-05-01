import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { RecordSalaryPaymentDialog } from '@/components/bursar/RecordSalaryPaymentDialog';
import { PayslipDialog } from '@/components/bursar/PayslipDialog';
import { formatUGX, MONTHS } from '@/lib/finance/format';

const SalaryPayments = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const [payslip, setPayslip] = useState<any>(null);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-options', profile?.school_id],
    enabled: !!profile?.school_id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name, role')
        .eq('school_id', profile!.school_id).eq('is_active', true)
        .in('role', ['teacher','admin','principal','head_teacher','bursar','librarian'] as const);
      return (data || []).map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, role: p.role }));
    },
  });

  const staffMap = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);

  const { data: salaries = [] } = useQuery({
    queryKey: ['staff-salaries', profile?.school_id],
    enabled: !!profile?.school_id,
    queryFn: async () => {
      const { data } = await supabase.from('staff_salaries').select('*').eq('school_id', profile!.school_id);
      return data || [];
    },
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['salary-payments', profile?.school_id],
    enabled: !!profile?.school_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_payments').select('*')
        .eq('school_id', profile!.school_id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['salary-payments'] });
    qc.invalidateQueries({ queryKey: ['salary-dashboard'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Payments</h1>
          <p className="text-muted-foreground">Record monthly salary payments and generate payslips</p>
        </div>
        <Button onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> :
            payments.length === 0 ? <div className="py-8 text-center text-muted-foreground">No payments recorded yet.</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payslip #</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => {
                  const st = staffMap.get(p.staff_profile_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.payslip_number}</TableCell>
                      <TableCell>{st?.name || p.staff_profile_id.slice(0,8)}<div className="text-xs text-muted-foreground">{st?.role}</div></TableCell>
                      <TableCell>{MONTHS[p.pay_month - 1]} {p.pay_year}</TableCell>
                      <TableCell className="text-right font-semibold">{formatUGX(p.amount_paid)}</TableCell>
                      <TableCell className="capitalize">{p.payment_method.replace('_',' ')}</TableCell>
                      <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setPayslip(p)}>
                          <FileText className="h-4 w-4 mr-1" />Payslip
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecordSalaryPaymentDialog open={recordOpen} onClose={() => setRecordOpen(false)} onSaved={refresh} salaries={salaries} staffMap={staffMap} />
      <PayslipDialog
        open={!!payslip}
        onClose={() => setPayslip(null)}
        payment={payslip}
        staffName={payslip ? staffMap.get(payslip.staff_profile_id)?.name : ''}
        staffRole={payslip ? staffMap.get(payslip.staff_profile_id)?.role : ''}
      />
    </div>
  );
};

export default SalaryPayments;
