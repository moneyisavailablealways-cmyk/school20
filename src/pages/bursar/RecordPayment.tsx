import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Receipt } from 'lucide-react';

interface Student {
  id: string;
  student_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_amount: number;
  status: string;
}

const RecordPayment = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  
  const [formData, setFormData] = useState({
    student_id: '',
    invoice_id: '',
    amount: '',
    payment_method: '',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (formData.student_id) {
      fetchInvoices(formData.student_id);
    } else {
      setInvoices([]);
    }
  }, [formData.student_id]);

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          profiles!inner(first_name, last_name)
        `)
        .eq('enrollment_status', 'active');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async (studentId: string) => {
    try {
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['pending', 'partially_paid'])
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student invoices',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSelectedInvoice = () => {
    if (!formData.invoice_id || formData.invoice_id === 'no-invoice') {
      return null;
    }
    return invoices.find(inv => inv.id === formData.invoice_id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const selectedInvoice = getSelectedInvoice();
      const paymentAmount = parseFloat(formData.amount);

      if (!formData.student_id || !formData.payment_method || !formData.payment_reference || !paymentAmount) {
        throw new Error('Please fill in all required fields');
      }

      if (selectedInvoice && paymentAmount > selectedInvoice.balance_amount) {
        throw new Error(`Payment amount cannot exceed outstanding balance of $${selectedInvoice.balance_amount}`);
      }

      // Create payment record
      const { error } = await supabase
        .from('payments')
        .insert({
          student_id: formData.student_id,
          invoice_id: formData.invoice_id === 'no-invoice' ? null : formData.invoice_id,
          amount: paymentAmount,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference,
          payment_date: formData.payment_date,
          notes: formData.notes || null,
          status: 'completed',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      navigate('/bursar/payments');
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedInvoice = getSelectedInvoice();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/bursar/payments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
          <p className="text-muted-foreground">Add a new payment transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Details</span>
              </CardTitle>
              <CardDescription>Record payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="student">Student *</Label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => handleInputChange('student_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_id} - {student.profiles.first_name} {student.profiles.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invoice">Invoice (Optional)</Label>
                <Select
                  value={formData.invoice_id}
                  onValueChange={(value) => handleInputChange('invoice_id', value)}
                  disabled={!formData.student_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.student_id ? "Select invoice" : "Select student first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-invoice">No specific invoice</SelectItem>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - Balance: ${invoice.balance_amount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="online_payment">Online Payment</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_reference">Payment Reference *</Label>
                <Input
                  id="payment_reference"
                  value={formData.payment_reference}
                  onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                  placeholder="Transaction ID, receipt number, etc."
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional payment notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Payment Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedInvoice && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Invoice:</span>
                      <span>{selectedInvoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Amount:</span>
                      <span>${selectedInvoice.total_amount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Outstanding Balance:</span>
                      <span>${selectedInvoice.balance_amount}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-sm">
                        <span>Payment Amount:</span>
                        <span>${formData.amount || '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>New Balance:</span>
                        <span>
                          ${Math.max(0, selectedInvoice.balance_amount - (parseFloat(formData.amount) || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                {!selectedInvoice && formData.amount && (
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Payment Amount:</span>
                    <span>${formData.amount}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/bursar/payments')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RecordPayment;