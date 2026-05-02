import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { SalaryStructureDialog } from '@/components/bursar/SalaryStructureDialog';
import { RecordSalaryPaymentDialog } from '@/components/bursar/RecordSalaryPaymentDialog';
import { PayslipDialog } from '@/components/bursar/PayslipDialog';
import { formatUGX, MONTHS } from '@/lib/finance/format';
import { toast } from 'sonner';

const STAFF_ROLES = ['teacher', 'admin', 'principal', 'head_teacher', 'bursar', 'librarian'] as const;

const SalaryManagement = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [payslip, setPayslip] = useState<any>(null);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-options', profile?.school_id],
    enabled: !!profile?.school_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('school_id', profile!.school_id)
        .eq('is_active', true)
        .in('role', STAFF_ROLES)
        .order('first_name');
      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, role: p.role }));
    },
  });

  const staffMap = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['staff-salaries', profile?.school_id],
    enabled: !!profile?.school_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_salaries')
        .select('*')
        .eq('school_id', profile!.school_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map = new Map(staff.map(s => [s.id, s]));
      return (data || []).map(s => ({ ...s, _staff: map.get(s.staff_profile_id) }));
    },
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
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
    qc.invalidateQueries({ queryKey: ['staff-salaries'] });
    qc.invalidateQueries({ queryKey: ['salary-payments'] });
    qc.invalidateQueries({ queryKey: ['salary-dashboard'] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this salary structure?')) return;
    const { error } = await supabase.from('staff_salaries').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Salary Management</h1>
        <p className="text-muted-foreground">Define salary structures and record monthly payments</p>
      </div>

      <Tabs defaultValue="structures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="structures">Salary Structures</TabsTrigger>
          <TabsTrigger value="payments">Salary Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Salary Structure
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Staff Salary Structures</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : salaries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No salary structures yet.</div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s._staff?.name || s.staff_profile_id.slice(0, 8)}<div className="text-xs text-muted-foreground">{s._staff?.role}</div></TableCell>
                        <TableCell><Badge variant="outline">{s.staff_type === 'teaching' ? 'Teaching' : 'Non-Teaching'}</Badge></TableCell>
                        <TableCell className="text-right">{formatUGX(s.base_salary)}</TableCell>
                        <TableCell className="text-right">{formatUGX(s.allowances)}</TableCell>
                        <TableCell className="text-right">{formatUGX(s.deductions)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatUGX(s.net_salary)}</TableCell>
                        <TableCell>{new Date(s.effective_from).toLocaleDateString()}</TableCell>
                        <TableCell>{s.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
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
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent>
              {loadingPayments ? <div className="py-8 text-center text-muted-foreground">Loading...</div> :
                payments.length === 0 ? <div className="py-8 text-center text-muted-foreground">No payments recorded yet.</div> : (
                <div className="overflow-x-auto">
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SalaryStructureDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
        editing={editing}
        staffOptions={staff}
      />
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

export default SalaryManagement;
