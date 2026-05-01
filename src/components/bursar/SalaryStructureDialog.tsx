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

interface StaffOption { id: string; name: string; role: string; }
interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: any | null;
  staffOptions: StaffOption[];
}

export const SalaryStructureDialog = ({ open, onClose, onSaved, editing, staffOptions }: Props) => {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_profile_id: '',
    staff_type: 'teaching',
    base_salary: '',
    allowances: '',
    deductions: '',
    effective_from: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        staff_profile_id: editing.staff_profile_id,
        staff_type: editing.staff_type,
        base_salary: String(editing.base_salary ?? ''),
        allowances: String(editing.allowances ?? ''),
        deductions: String(editing.deductions ?? ''),
        effective_from: editing.effective_from,
        notes: editing.notes || '',
      });
    } else {
      setForm({
        staff_profile_id: '', staff_type: 'teaching',
        base_salary: '', allowances: '', deductions: '',
        effective_from: new Date().toISOString().slice(0, 10), notes: '',
      });
    }
  }, [editing, open]);

  const net = (parseFloat(form.base_salary || '0') + parseFloat(form.allowances || '0') - parseFloat(form.deductions || '0'));

  const save = async () => {
    if (!form.staff_profile_id) { toast.error('Select a staff member'); return; }
    if (!profile?.school_id) { toast.error('Missing school context'); return; }
    setSaving(true);
    const payload: any = {
      school_id: profile.school_id,
      staff_profile_id: form.staff_profile_id,
      staff_type: form.staff_type,
      base_salary: parseFloat(form.base_salary || '0'),
      allowances: parseFloat(form.allowances || '0'),
      deductions: parseFloat(form.deductions || '0'),
      effective_from: form.effective_from,
      notes: form.notes || null,
      created_by: profile.id,
    };
    const res = editing
      ? await supabase.from('staff_salaries').update(payload).eq('id', editing.id)
      : await supabase.from('staff_salaries').insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? 'Salary updated' : 'Salary structure created');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Salary Structure' : 'New Salary Structure'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Staff Member</Label>
            <Select value={form.staff_profile_id} onValueChange={(v) => setForm({ ...form, staff_profile_id: v })} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Staff Type</Label>
            <Select value={form.staff_type} onValueChange={(v) => setForm({ ...form, staff_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="teaching">Teaching</SelectItem>
                <SelectItem value="non_teaching">Non-Teaching</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Base Salary (UGX)</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></div>
            <div><Label>Effective From</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
            <div><Label>Allowances (UGX)</Label><Input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} /></div>
            <div><Label>Deductions (UGX)</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} /></div>
          </div>
          <div className="rounded-md bg-muted p-3">
            <div className="text-sm text-muted-foreground">Net Salary</div>
            <div className="text-2xl font-bold">UGX {net.toLocaleString()}</div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
