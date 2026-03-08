import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, FileText, Search, ChevronsUpDown, Check, Calculator, AlertCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ReportCardFee {
  id: string;
  school_id: string;
  academic_year_id: string;
  term: string;
  class_id: string | null;
  fees_balance_note: string | null;
  fees_next_term: string | null;
  other_requirements: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  academic_years?: { name: string };
  classes?: { name: string; levels?: { name: string } };
}

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

const ReportCardFees = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [fees, setFees] = useState<ReportCardFee[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classComboOpen, setClassComboOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterTerm, setFilterTerm] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ReportCardFee | null>(null);
  const [formData, setFormData] = useState({
    academic_year_id: '',
    term: '',
    class_id: '',
    fees_balance_note: '',
    fees_next_term: '',
    other_requirements: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [feesRes, yearsRes, classesRes] = await Promise.all([
        supabase
          .from('report_card_fees')
          .select(`*, academic_years(name), classes(name, levels:level_id(name))`)
          .order('created_at', { ascending: false }),
        supabase
          .from('academic_years')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select(`*, levels:level_id(name)`)
          .order('name', { ascending: true }),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (yearsRes.error) throw yearsRes.error;
      if (classesRes.error) throw classesRes.error;

      setFees(feesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch report card fees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.academic_year_id || !formData.term) {
      toast({ title: 'Validation Error', description: 'Academic year and term are required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        school_id: profile?.school_id,
        academic_year_id: formData.academic_year_id,
        term: formData.term,
        class_id: formData.class_id || null,
        fees_balance_note: formData.fees_balance_note || null,
        fees_next_term: formData.fees_next_term || null,
        other_requirements: formData.other_requirements || null,
        updated_by: profile?.id,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('report_card_fees')
          .update(payload)
          .eq('id', editingFee.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Report card fee entry updated' });
      } else {
        const { error } = await supabase
          .from('report_card_fees')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Success', description: 'Report card fee entry created' });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
    }
  };

  const handleEdit = (fee: ReportCardFee) => {
    setEditingFee(fee);
    setFormData({
      academic_year_id: fee.academic_year_id,
      term: fee.term,
      class_id: fee.class_id || '',
      fees_balance_note: fee.fees_balance_note || '',
      fees_next_term: fee.fees_next_term || '',
      other_requirements: fee.other_requirements || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      const { error } = await supabase.from('report_card_fees').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Entry deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingFee(null);
    setFormData({
      academic_year_id: '',
      term: '',
      class_id: '',
      fees_balance_note: '',
      fees_next_term: '',
      other_requirements: '',
    });
  };

  const filteredFees = fees.filter((fee) => {
    const matchesSearch =
      fee.fees_balance_note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.fees_next_term?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.other_requirements?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fee.classes as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === 'all' || fee.academic_year_id === filterYear;
    const matchesTerm = filterTerm === 'all' || fee.term === filterTerm;
    return (matchesSearch !== false) && matchesYear && matchesTerm;
  });

  const getClassName = (fee: ReportCardFee) => {
    if (!fee.classes) return 'All Classes';
    const cls = fee.classes as any;
    return cls.levels ? `${cls.name} (${cls.levels.name})` : cls.name;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Report Card Fees</h1>
        <p className="text-muted-foreground">
          Manage fees displayed on report cards. Student balances are auto-calculated from invoices & payments.
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <FileText className="h-4 w-4 mr-2" />
            Fee Settings
          </TabsTrigger>
          <TabsTrigger value="overrides">
            <Calculator className="h-4 w-4 mr-2" />
            Balance Overrides
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Fee Settings (existing functionality) */}
        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card className="flex-1 mr-4 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Auto-Calculated Balances</p>
                    <p className="text-muted-foreground">
                      Student fees balances are now automatically calculated from invoices and payments.
                      Use "Balance Overrides" tab for bursary/scholarship/waiver adjustments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingFee ? 'Edit Report Card Fee' : 'Add Report Card Fee'}</DialogTitle>
                  <DialogDescription>
                    Set next term fees and requirements for report cards. Fees balance is auto-calculated.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
                  <div>
                    <Label>Academic Year *</Label>
                    <Select value={formData.academic_year_id} onValueChange={(v) => setFormData(p => ({ ...p, academic_year_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y) => (
                          <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Term *</Label>
                    <Select value={formData.term} onValueChange={(v) => setFormData(p => ({ ...p, term: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                      <SelectContent>
                        {TERMS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Class (Optional — leave empty for all classes)</Label>
                    <Popover open={classComboOpen} onOpenChange={setClassComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={classComboOpen}
                          className="w-full justify-between font-normal"
                        >
                          {formData.class_id
                            ? (() => {
                                const cls = classes.find(c => c.id === formData.class_id);
                                return cls ? `${cls.name}${cls.levels ? ` (${cls.levels.name})` : ''}` : 'All Classes';
                              })()
                            : 'All Classes'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search classes..." />
                          <CommandList>
                            <CommandEmpty>No class found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all-classes"
                                onSelect={() => {
                                  setFormData(p => ({ ...p, class_id: '' }));
                                  setClassComboOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !formData.class_id ? "opacity-100" : "opacity-0")} />
                                All Classes
                              </CommandItem>
                              {classes
                                .filter((cls) => {
                                  const levelName = (cls.levels?.name || '').toLowerCase();
                                  const className = (cls.name || '').toLowerCase();
                                  const combined = `${className} ${levelName}`;
                                  const aLevelPatterns = /\b(s\.?5|s\.?6|senior\s*5|senior\s*6|form\s*5|form\s*6|f\.?5|f\.?6|a[\s-]?level)\b/;
                                  return !aLevelPatterns.test(combined);
                                })
                                .map((cls) => (
                                <CommandItem
                                  key={cls.id}
                                  value={`${cls.name} ${cls.levels?.name || ''}`}
                                  onSelect={() => {
                                    setFormData(p => ({ ...p, class_id: cls.id }));
                                    setClassComboOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", formData.class_id === cls.id ? "opacity-100" : "opacity-0")} />
                                  {cls.name} {cls.levels && `(${cls.levels.name})`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Fees for Next Term</Label>
                    <Textarea
                      value={formData.fees_next_term}
                      onChange={(e) => setFormData(p => ({ ...p, fees_next_term: e.target.value }))}
                      placeholder="e.g., UGX 1,200,000 (Tuition + Boarding)"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Other Requirements</Label>
                    <Textarea
                      value={formData.other_requirements}
                      onChange={(e) => setFormData(p => ({ ...p, other_requirements: e.target.value }))}
                      placeholder="e.g., 2 reams of paper, a broom, toilet paper..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingFee ? 'Update' : 'Create'} Entry
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter by term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {TERMS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Fee Entries ({filteredFees.length})
              </CardTitle>
              <CardDescription>
                Next term fees and requirements shown in report card footer. Balances are auto-calculated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Entries Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterYear !== 'all' || filterTerm !== 'all'
                      ? 'No entries match your filters.'
                      : 'Add your first report card fee entry to get started.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Next Term Fees</TableHead>
                        <TableHead>Requirements</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>
                            <Badge variant="outline">{fee.academic_years?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{fee.term}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{getClassName(fee)}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={fee.fees_next_term || ''}>
                            {fee.fees_next_term || '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={fee.other_requirements || ''}>
                            {fee.other_requirements || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(fee)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(fee.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

        {/* Tab 2: Balance Overrides */}
        <TabsContent value="overrides" className="space-y-4">
          <StudentFeeOverrides
            academicYears={academicYears}
            profile={profile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Student Fee Overrides sub-component
const StudentFeeOverrides: React.FC<{ academicYears: any[]; profile: any }> = ({ academicYears, profile }) => {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentComboOpen, setStudentComboOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    academic_year_id: '',
    term: '',
    override_amount: '',
    override_reason: '',
    override_type: 'manual',
  });

  useEffect(() => {
    fetchOverrides();
    fetchStudents();
  }, []);

  const fetchOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from('student_fee_overrides')
        .select(`*, students(student_id, profiles:profile_id(first_name, last_name)), academic_years(name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOverrides(data || []);
    } catch (error: any) {
      console.error('Error fetching overrides:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`id, student_id, profiles:profile_id(first_name, last_name)`)
      .order('student_id', { ascending: true })
      .limit(500);
    setStudents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.academic_year_id || !formData.term || !formData.override_amount) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        student_id: formData.student_id,
        academic_year_id: formData.academic_year_id,
        term: formData.term,
        override_amount: parseFloat(formData.override_amount),
        override_reason: formData.override_reason || null,
        override_type: formData.override_type,
        created_by: profile?.id,
        school_id: profile?.school_id,
      };

      if (editingOverride) {
        const { error } = await supabase
          .from('student_fee_overrides')
          .update(payload)
          .eq('id', editingOverride.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Override updated' });
      } else {
        const { error } = await supabase
          .from('student_fee_overrides')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Success', description: 'Override created' });
      }

      resetForm();
      fetchOverrides();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this override? The student balance will revert to auto-calculation.')) return;
    try {
      const { error } = await supabase.from('student_fee_overrides').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Override removed' });
      fetchOverrides();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingOverride(null);
    setFormData({ student_id: '', academic_year_id: '', term: '', override_amount: '', override_reason: '', override_type: 'manual' });
  };

  const getStudentName = (student: any) => {
    if (!student?.profiles) return student?.student_id || 'Unknown';
    return `${student.profiles.first_name} ${student.profiles.last_name} (${student.student_id})`;
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const name = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''} ${s.student_id || ''}`.toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

  const OVERRIDE_TYPES = [
    { value: 'manual', label: 'Manual Adjustment' },
    { value: 'bursary', label: 'Bursary' },
    { value: 'waiver', label: 'Fee Waiver' },
    { value: 'discount', label: 'Discount' },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <Card className="flex-1 mr-4 border-accent/20 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-accent-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Balance Override</p>
                <p className="text-muted-foreground">
                  Use overrides for students on bursary, scholarship, fee waiver, or special payment agreements.
                  Overrides replace the auto-calculated balance on the report card.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Override
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingOverride ? 'Edit Balance Override' : 'Add Balance Override'}</DialogTitle>
              <DialogDescription>
                Override the auto-calculated fees balance for a specific student.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
              <div>
                <Label>Student *</Label>
                <Popover open={studentComboOpen} onOpenChange={setStudentComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {formData.student_id
                        ? getStudentName(students.find(s => s.id === formData.student_id))
                        : 'Select student...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search students..." onValueChange={setStudentSearch} />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup>
                          {filteredStudents.slice(0, 50).map((s) => (
                            <CommandItem
                              key={s.id}
                              value={getStudentName(s)}
                              onSelect={() => {
                                setFormData(p => ({ ...p, student_id: s.id }));
                                setStudentComboOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.student_id === s.id ? "opacity-100" : "opacity-0")} />
                              {getStudentName(s)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Academic Year *</Label>
                <Select value={formData.academic_year_id} onValueChange={(v) => setFormData(p => ({ ...p, academic_year_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Term *</Label>
                <Select value={formData.term} onValueChange={(v) => setFormData(p => ({ ...p, term: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {TERMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Override Type *</Label>
                <Select value={formData.override_type} onValueChange={(v) => setFormData(p => ({ ...p, override_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Override Balance Amount (UGX) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.override_amount}
                  onChange={(e) => setFormData(p => ({ ...p, override_amount: e.target.value }))}
                  placeholder="e.g., 0 for fully sponsored"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the exact balance to show on the report card. Set to 0 for fully sponsored students.
                </p>
              </div>

              <div>
                <Label>Reason</Label>
                <Textarea
                  value={formData.override_reason}
                  onChange={(e) => setFormData(p => ({ ...p, override_reason: e.target.value }))}
                  placeholder="e.g., 50% bursary awarded by school board"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingOverride ? 'Update' : 'Create'} Override
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Active Overrides ({overrides.length})
          </CardTitle>
          <CardDescription>
            Students with manually overridden fee balances. All changes are logged in the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : overrides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Overrides</h3>
              <p className="text-muted-foreground">
                All student balances are being auto-calculated from invoices and payments.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Override Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.map((ov) => (
                    <TableRow key={ov.id}>
                      <TableCell className="font-medium">
                        {ov.students?.profiles
                          ? `${ov.students.profiles.first_name} ${ov.students.profiles.last_name}`
                          : ov.students?.student_id || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ov.academic_years?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ov.term}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ov.override_type === 'bursary' ? 'default' : 'outline'}>
                          {ov.override_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        UGX {Number(ov.override_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={ov.override_reason || ''}>
                        {ov.override_reason || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingOverride(ov);
                              setFormData({
                                student_id: ov.student_id,
                                academic_year_id: ov.academic_year_id,
                                term: ov.term,
                                override_amount: String(ov.override_amount),
                                override_reason: ov.override_reason || '',
                                override_type: ov.override_type,
                              });
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(ov.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </>
  );
};

export default ReportCardFees;
