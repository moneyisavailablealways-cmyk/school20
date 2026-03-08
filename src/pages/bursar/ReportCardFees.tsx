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
import { Plus, Edit, Trash2, FileText, Search, ChevronsUpDown, Check } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Card Fees</h1>
          <p className="text-muted-foreground">
            Manage fees balance and requirements shown on student report cards
          </p>
        </div>
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
                Set fees balance, next term fees, and requirements for report cards
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
                <Select value={formData.class_id || 'all'} onValueChange={(v) => setFormData(p => ({ ...p, class_id: v === 'all' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
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
                <Label>Fees Balance Note</Label>
                <Textarea
                  value={formData.fees_balance_note}
                  onChange={(e) => setFormData(p => ({ ...p, fees_balance_note: e.target.value }))}
                  placeholder="e.g., UGX 500,000 outstanding balance"
                  rows={2}
                />
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
            These entries appear in the footer section of generated report card PDFs
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
                    <TableHead>Fees Balance</TableHead>
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
                      <TableCell className="max-w-[200px] truncate" title={fee.fees_balance_note || ''}>
                        {fee.fees_balance_note || '—'}
                      </TableCell>
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
    </div>
  );
};

export default ReportCardFees;
