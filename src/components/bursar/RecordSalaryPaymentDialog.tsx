import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { MONTHS } from '@/lib/finance/format';

interface Props { open: boolean; onClose: () => void; onSaved: () => void; salaries: any[]; staffMap: Map<string, any>; }

export const RecordSalaryPaymentDialog = ({ open, onClose, onSaved, salaries, staffMap }: Props) => {
  const { profile } = useAuth();
  const today = new Date();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_salary_id: '',
    pay_month: String(today.getMonth() + 1),
    pay_year: String(today.getFullYear()),
    payment_date: today.toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    status: 'paid',
  });

  useEffect(() => {
    if (open) {
      setForm({
        staff_salary_id: '', pay_month: String(today.getMonth() + 1), pay_year: String(today.getFullYear()),
        payment_date: today.toISOString().slice(0, 10), payment_method: 'bank_transfer',
        reference_number: '', notes: '', status: 'paid',
      });
    }
  }, [open]);

  const sel = salaries.find(s => s.id === form.staff_salary_id);

  const save = async () => {
    if (!sel) { toast.error('Select a staff salary'); return; }
    if (!profile?.school_id) return;
    setSaving(true);
    const { error } = await supabase.from('salary_payments').insert({
      school_id: profile.school_id,
      staff_profile_id: sel.staff_profile_id,
      staff_salary_id: sel.id,
      pay_month: parseInt(form.pay_month),
      pay_year: parseInt(form.pay_year),
      base_salary: sel.base_salary,
      allowances: sel.allowances,
      deductions: sel.deductions,
      amount_paid: sel.net_salary,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      status: form.status,
      recorded_by: profile.id,
    });
    setSaving(false);
    if (error) {
      if (error.code === '23505') toast.error('Payment for this staff/month already exists');
      else toast.error(error.message);
      return;
    }
    toast.success('Payment recorded');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Salary Payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Staff Member</Label>
            <Select value={form.staff_salary_id} onValueChange={(v) => setForm({ ...form, staff_salary_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select staff with salary" /></SelectTrigger>
              <SelectContent>
                {salaries.filter(s => s.is_active).map(s => {
                  const st = staffMap.get(s.staff_profile_id);
                  return <SelectItem key={s.id} value={s.id}>{st?.name || s.staff_profile_id.slice(0,8)} — UGX {Number(s.net_salary).toLocaleString()}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Select value={form.pay_month} onValueChange={(v) => setForm({ ...form, pay_month: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Year</Label><Input type="number" value={form.pay_year} onChange={(e) => setForm({ ...form, pay_year: e.target.value })} /></div>
            <div><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
            <div>
              <Label>Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Reference / Transaction ID</Label><Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          {sel && (
            <div className="rounded-md bg-muted p-3 text-sm">
              Net Pay: <strong>UGX {Number(sel.net_salary).toLocaleString()}</strong> (Base {Number(sel.base_salary).toLocaleString()} + Allow {Number(sel.allowances).toLocaleString()} − Ded {Number(sel.deductions).toLocaleString()})
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
