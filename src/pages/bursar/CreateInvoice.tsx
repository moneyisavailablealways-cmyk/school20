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
import { FileText, ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Student {
  id: string;
  student_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  fee_type: string;
}

interface InvoiceItem {
  fee_structure_id: string;
  description: string;
  amount: number;
}

const CreateInvoice = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    student_id: '',
    due_date: '',
    notes: '',
  });
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { fee_structure_id: '', description: '', amount: 0 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          profiles!inner(first_name, last_name)
        `)
        .eq('enrollment_status', 'active');

      // Fetch fee structures
      const { data: feeData, error: feeError } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('is_active', true);

      if (studentsError || feeError) {
        throw studentsError || feeError;
      }

      setStudents(studentsData || []);
      setFeeStructures(feeData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...invoiceItems];
    if (field === 'fee_structure_id' && value) {
      const feeStructure = feeStructures.find(f => f.id === value);
      if (feeStructure) {
        updatedItems[index] = {
          ...updatedItems[index],
          fee_structure_id: value as string,
          description: feeStructure.name,
          amount: feeStructure.amount,
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    setInvoiceItems(updatedItems);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { fee_structure_id: '', description: '', amount: 0 }]);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const getTotalAmount = () => {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.student_id || !formData.due_date) {
        throw new Error('Please fill in all required fields');
      }

      if (invoiceItems.length === 0 || invoiceItems.some(item => !item.description || !item.amount)) {
        throw new Error('Please add at least one valid invoice item');
      }

      const totalAmount = getTotalAmount();

      // Generate invoice number
      const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceNumberError) throw invoiceNumberError;

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumberData,
          student_id: formData.student_id,
          total_amount: totalAmount,
          balance_amount: totalAmount,
          due_date: formData.due_date,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items with proper student_fee_id handling
      const itemsToInsert = [];
      
      for (const item of invoiceItems) {
        let studentFeeId = null;
        
        if (item.fee_structure_id) {
          // Check if student_fee record exists
          const { data: existingStudentFee } = await supabase
            .from('student_fees')
            .select('id')
            .eq('student_id', formData.student_id)
            .eq('fee_structure_id', item.fee_structure_id)
            .maybeSingle();

          if (existingStudentFee) {
            studentFeeId = existingStudentFee.id;
          } else {
            // Create student_fee record
            const { data: newStudentFee, error: studentFeeError } = await supabase
              .from('student_fees')
              .insert({
                student_id: formData.student_id,
                fee_structure_id: item.fee_structure_id,
                amount: Number(item.amount),
                final_amount: Number(item.amount),
                due_date: formData.due_date,
                status: 'pending'
              })
              .select('id')
              .single();

            if (studentFeeError) {
              throw new Error(`Failed to create student fee record: ${studentFeeError.message}`);
            }
            
            studentFeeId = newStudentFee.id;
          }
        }

        itemsToInsert.push({
          invoice_id: invoiceData.id,
          description: item.description,
          amount: Number(item.amount),
          student_fee_id: studentFeeId,
        });
      }

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        throw new Error(`Failed to create invoice items: ${itemsError.message}`);
      }

      toast({
        title: 'Success',
        description: `Invoice ${invoiceNumberData} created successfully`,
      });

      navigate('/bursar/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/bursar/invoices')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Invoice</h1>
          <p className="text-muted-foreground">Create a new student invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Invoice Details</span>
              </CardTitle>
              <CardDescription>Basic invoice information</CardDescription>
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
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes for this invoice"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items:</span>
                  <span>{invoiceItems.length}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>${getTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Items</CardTitle>
                <CardDescription>Add fees and charges for this invoice</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addInvoiceItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoiceItems.map((item, index) => (
                <div key={index} className="grid gap-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {invoiceItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvoiceItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Fee Structure</Label>
                      <Select
                        value={item.fee_structure_id}
                        onValueChange={(value) => handleItemChange(index, 'fee_structure_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fee" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeStructures.map((fee) => (
                            <SelectItem key={fee.id} value={fee.id}>
                              {fee.name} - ${fee.amount}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>

                    <div>
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/bursar/invoices')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;