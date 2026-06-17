import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Wallet, FileText, Receipt, CreditCard, Users, BarChart3, Plus, AlertTriangle,
  Printer, UserX, GraduationCap, ClipboardList, Banknote, PieChart,
} from 'lucide-react';
import { useTermLabel } from '@/hooks/useTermLabel';

import FinanceDashboard from './FinanceDashboard';
import FeeStructures from './FeeStructures';
import Invoices from './Invoices';
import Payments from './Payments';
import StudentAccounts from './StudentAccounts';
import Scholarships from './Scholarships';
import ReportCardFees from './ReportCardFees';
import Reports from './Reports';
import SalaryManagement from './SalaryManagement';

const FinanceWorkspace = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get('tab') || 'dashboard';
  const [tab, setTab] = useState<string>(initial);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const { profile } = useAuth();
  const { plural: studentsLabel, singular: studentLabel } = useTermLabel();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const changeTab = (t: string) => {
    setTab(t);
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  const TABS = [
    { value: 'dashboard',    label: 'Dashboard',           icon: BarChart3 },
    { value: 'fee-structure',label: 'Fee Structures',      icon: FileText },
    { value: 'invoices',     label: 'Invoices',            icon: Receipt },
    { value: 'payments',     label: 'Payments',            icon: CreditCard },
    { value: 'accounts',     label: `${studentsLabel} Accounts`, icon: Users },
    { value: 'adjustments',  label: 'Scholarships & Discounts',  icon: GraduationCap },
    { value: 'footer',       label: 'Report Card Footer',  icon: ClipboardList },
    { value: 'salaries',     label: 'Salaries',            icon: Banknote },
    { value: 'reports',      label: 'Finance Reports',     icon: PieChart },
  ] as const;

  const handleReset = async () => {
    if (!profile?.school_id) { toast.error('Could not determine your school'); return; }
    setResetting(true);
    const { data, error } = await supabase.rpc('reset_school_finance_data', {
      p_school_id: profile.school_id,
    });
    setResetting(false);
    if (error) { toast.error(error.message || 'Failed to reset finance data'); return; }
    const counts = data as any;
    toast.success('Finance data has been successfully reset.', {
      description: `Removed ${counts?.invoices ?? 0} invoices, ${counts?.payments ?? 0} payments, ${counts?.fee_structures ?? 0} fee structures, ${counts?.scholarships ?? 0} scholarships, ${counts?.overrides ?? 0} adjustments.`,
    });
    setResetOpen(false);
    setConfirmText('');
    qc.invalidateQueries();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-7 w-7" /> Finance Workspace
          </h1>
          <p className="text-muted-foreground text-sm">
            One connected system: fee structures, invoices, payments, {studentsLabel.toLowerCase()} accounts, scholarships, report cards, salaries & reports.
          </p>
        </div>

        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" /> Reset Finance Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all finance data for your school?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes invoices, payments, fee structures, scholarships, adjustments and reminders
                for <span className="font-semibold">your school only</span>. Tables remain intact. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm">Type <span className="font-mono font-bold">RESET</span> to confirm</Label>
              <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={resetting || confirmText !== 'RESET'}
                className="bg-destructive hover:bg-destructive/90"
              >
                {resetting ? 'Resetting…' : 'Reset Finance Data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
        <Button size="sm" onClick={() => navigate('/bursar/payments/new')}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Payment
        </Button>
        <Button size="sm" variant="secondary" onClick={() => navigate('/bursar/invoices/create')}>
          <Receipt className="h-4 w-4 mr-1.5" /> Generate Invoice
        </Button>
        <Button size="sm" variant="outline" onClick={() => changeTab('payments')}>
          <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
        </Button>
        <Button size="sm" variant="outline" onClick={() => changeTab('accounts')}>
          <UserX className="h-4 w-4 mr-1.5" /> View Defaulters
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex h-auto flex-wrap gap-1 p-1 w-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs md:text-sm">
                <t.icon className="h-3.5 w-3.5 mr-1.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-2"><FinanceDashboard onNavigateTab={changeTab} /></TabsContent>
        <TabsContent value="fee-structure" className="mt-2"><FeeStructures /></TabsContent>
        <TabsContent value="invoices" className="mt-2"><Invoices /></TabsContent>
        <TabsContent value="payments" className="mt-2"><Payments /></TabsContent>
        <TabsContent value="accounts" className="mt-2"><StudentAccounts /></TabsContent>
        <TabsContent value="adjustments" className="mt-2"><Scholarships /></TabsContent>
        <TabsContent value="footer" className="mt-2"><ReportCardFees /></TabsContent>
        <TabsContent value="salaries" className="mt-2"><SalaryManagement /></TabsContent>
        <TabsContent value="reports" className="mt-2"><Reports /></TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceWorkspace;
