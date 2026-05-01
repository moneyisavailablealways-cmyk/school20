import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { loadCurrentSchoolBranding } from '@/components/report-cards/reportBranding';
import { useAuth } from '@/hooks/useAuth';
import { formatUGX, MONTHS } from '@/lib/finance/format';
import { Printer, Download } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; payment: any | null; staffName?: string; staffRole?: string; }

export const PayslipDialog = ({ open, onClose, payment, staffName, staffRole }: Props) => {
  const { profile } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && profile?.school_id) {
      loadCurrentSchoolBranding(profile.school_id).then(setSchool);
    }
  }, [open, profile?.school_id]);

  if (!payment) return null;

  const print = () => {
    const html = ref.current?.innerHTML || '';
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<html><head><title>Payslip ${payment.payslip_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1,h2,h3{margin:4px 0}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #ddd;text-align:left}.right{text-align:right}.center{text-align:center}.muted{color:#666;font-size:12px}.box{border:1px solid #ddd;padding:12px;border-radius:6px;margin-top:12px}</style>
      </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payslip Preview</DialogTitle>
        </DialogHeader>
        <div ref={ref} className="bg-white text-black p-6 rounded">
          <div className="text-center border-b pb-4 mb-4">
            {school?.logoUrl && <img src={school.logoUrl} alt="logo" style={{ height: 60, margin: '0 auto 8px' }} />}
            <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>{school?.name || 'School Name'}</h1>
            {school?.motto && <div className="muted">{school.motto}</div>}
            <div className="muted">{school?.address} {school?.poBox && `• ${school.poBox}`}</div>
            <div className="muted">{school?.phone} {school?.email && `• ${school.email}`}</div>
            <h2 style={{ marginTop: 12 }}>PAYSLIP</h2>
            <div className="muted">Payslip No: <strong>{payment.payslip_number}</strong></div>
          </div>

          <table>
            <tbody>
              <tr><th>Staff Name</th><td>{staffName || '-'}</td><th>Role</th><td>{staffRole || '-'}</td></tr>
              <tr><th>Pay Period</th><td>{MONTHS[payment.pay_month - 1]} {payment.pay_year}</td><th>Payment Date</th><td>{new Date(payment.payment_date).toLocaleDateString()}</td></tr>
              <tr><th>Method</th><td className="capitalize">{payment.payment_method.replace('_',' ')}</td><th>Status</th><td className="capitalize">{payment.status}</td></tr>
            </tbody>
          </table>

          <div className="box">
            <h3>Earnings & Deductions</h3>
            <table>
              <tbody>
                <tr><td>Base Salary</td><td className="right">{formatUGX(payment.base_salary)}</td></tr>
                <tr><td>Allowances</td><td className="right">{formatUGX(payment.allowances)}</td></tr>
                <tr><td>Deductions</td><td className="right">- {formatUGX(payment.deductions)}</td></tr>
                <tr><td><strong>Net Pay</strong></td><td className="right"><strong>{formatUGX(payment.amount_paid)}</strong></td></tr>
              </tbody>
            </table>
          </div>

          {payment.reference_number && <div className="muted" style={{ marginTop: 12 }}>Reference: {payment.reference_number}</div>}
          {payment.notes && <div className="muted">Notes: {payment.notes}</div>}

          <div className="center muted" style={{ marginTop: 24 }}>This is a computer-generated payslip.</div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={print}><Printer className="h-4 w-4 mr-2" />Print / Save as PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
