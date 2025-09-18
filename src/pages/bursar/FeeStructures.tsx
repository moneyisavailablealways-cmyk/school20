import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeeStructure {
  id: string;
  name: string;
  description: string;
  amount: number;
  fee_type: string;
  payment_schedule: string;
  due_date: string;
  is_active: boolean;
  academic_year_id: string;
  class_id: string;
  academic_years?: { name: string };
  classes?: { name: string; level_name?: string };
}

const FeeStructures = () => {
  const { toast } = useToast();
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    fee_type: '',
    payment_schedule: '',
    due_date: '',
    academic_year_id: '',
    class_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch fee structures with related data
      const { data: feeData, error: feeError } = await supabase
        .from('fee_structures')
        .select(`
          *,
          academic_years (name),
          classes (name, levels!level_id(name))
        `)
        .order('created_at', { ascending: false });

      // Fetch academic years
      const { data: yearData, error: yearError } = await supabase
        .from('academic_years')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch classes with level information
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          levels!level_id(name)
        `)
        .order('created_at', { ascending: false });

      if (feeError || yearError || classError) {
        throw feeError || yearError || classError;
      }

      setFeeStructures(feeData || []);
      setAcademicYears(yearData || []);
      setClasses(classData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch fee structures',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const feeData = {
        name: formData.name,
        description: formData.description,
        amount: parseFloat(formData.amount),
        fee_type: formData.fee_type,
        payment_schedule: formData.payment_schedule,
        due_date: formData.due_date || null,
        academic_year_id: formData.academic_year_id === "all" ? null : formData.academic_year_id || null,
        class_id: formData.class_id === "all" ? null : formData.class_id || null,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('fee_structures')
          .update(feeData)
          .eq('id', editingFee.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Fee structure updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('fee_structures')
          .insert(feeData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Fee structure created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingFee(null);
      setFormData({
        name: '',
        description: '',
        amount: '',
        fee_type: '',
        payment_schedule: '',
        due_date: '',
        academic_year_id: 'all',
        class_id: 'all',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving fee structure:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save fee structure',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      description: fee.description || '',
      amount: fee.amount.toString(),
      fee_type: fee.fee_type,
      payment_schedule: fee.payment_schedule,
      due_date: fee.due_date || '',
      academic_year_id: fee.academic_year_id || 'all',
      class_id: fee.class_id || 'all',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;

    try {
      const { error } = await supabase
        .from('fee_structures')
        .delete()
        .eq('id', feeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Fee structure deleted successfully',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting fee structure:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete fee structure',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (feeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('fee_structures')
        .update({ is_active: !currentStatus })
        .eq('id', feeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Fee structure ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
      fetchData();
    } catch (error: any) {
      console.error('Error updating fee structure:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update fee structure',
        variant: 'destructive',
      });
    }
  };

  const filteredFeeStructures = feeStructures.filter(fee => {
    const matchesSearch = fee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fee.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || fee.fee_type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getFeeTypeColor = (type: string) => {
    const colors = {
      tuition: 'bg-blue-100 text-blue-800',
      registration: 'bg-green-100 text-green-800',
      exam: 'bg-purple-100 text-purple-800',
      library: 'bg-yellow-100 text-yellow-800',
      transport: 'bg-orange-100 text-orange-800',
      uniform: 'bg-pink-100 text-pink-800',
      activity: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || colors.other;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Structures</h1>
          <p className="text-muted-foreground">
            Manage school fee structures and pricing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingFee(null);
              setFormData({
                name: '',
                description: '',
                amount: '',
                fee_type: '',
                payment_schedule: '',
                due_date: '',
                academic_year_id: 'all',
                class_id: 'all',
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Structure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingFee ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
              <DialogDescription>
                {editingFee ? 'Update the fee structure details' : 'Create a new fee structure for students'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Fee Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Tuition Fee - Grade 10"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
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
                  <Label htmlFor="fee_type">Fee Type</Label>
                  <Select value={formData.fee_type} onValueChange={(value) => handleInputChange('fee_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tuition">Tuition</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="library">Library</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="uniform">Uniform</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="payment_schedule">Payment Schedule</Label>
                <Select value={formData.payment_schedule} onValueChange={(value) => handleInputChange('payment_schedule', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="termly">Termly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="academic_year_id">Academic Year (Optional)</Label>
                <Select value={formData.academic_year_id} onValueChange={(value) => handleInputChange('academic_year_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class_id">Class (Optional)</Label>
                <Select value={formData.class_id} onValueChange={(value) => handleInputChange('class_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.levels && `(${cls.levels.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date (Optional)</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingFee ? 'Update' : 'Create'} Fee Structure
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search fee structures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tuition">Tuition</SelectItem>
            <SelectItem value="registration">Registration</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="library">Library</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="uniform">Uniform</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fee Structures Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredFeeStructures.map((fee) => (
          <Card key={fee.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{fee.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getFeeTypeColor(fee.fee_type)}>
                      {fee.fee_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant={fee.is_active ? 'default' : 'secondary'}>
                      {fee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(fee.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fee.payment_schedule.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fee.description && (
                <p className="text-sm text-muted-foreground">{fee.description}</p>
              )}
              
              <div className="space-y-2 text-sm">
                {fee.academic_years && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Academic Year:</span>
                    <span>{fee.academic_years.name}</span>
                  </div>
                )}
                {fee.classes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class:</span>
                    <span>{fee.classes.name}</span>
                  </div>
                )}
                {fee.due_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span>{new Date(fee.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(fee)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(fee.id, fee.is_active)}
                  className="flex-1"
                >
                  {fee.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(fee.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFeeStructures.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Fee Structures Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedType !== 'all' 
                ? 'No fee structures match your current filters.' 
                : 'Create your first fee structure to get started.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeeStructures;