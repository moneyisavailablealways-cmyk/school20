import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TermConfig {
  id?: string;
  academic_year_id: string;
  term_name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  next_term_start_date: string;
  fees_balance_note: string;
  fees_next_term: string;
  other_requirements: string;
  is_current: boolean;
}

const defaultTerm: TermConfig = {
  academic_year_id: '',
  term_name: 'Term 1',
  term_number: 1,
  start_date: '',
  end_date: '',
  next_term_start_date: '',
  fees_balance_note: '',
  fees_next_term: '',
  other_requirements: '',
  is_current: false,
};

const TermConfiguration = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermConfig | null>(null);
  const [formData, setFormData] = useState<TermConfig>(defaultTerm);

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch term configurations
  const { data: termConfigs, isLoading } = useQuery({
    queryKey: ['term-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('term_configurations')
        .select(`
          *,
          academic_years(name)
        `)
        .order('academic_year_id')
        .order('term_number');
      if (error) throw error;
      return data;
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (term: TermConfig) => {
      if (term.id) {
        const { error } = await supabase
          .from('term_configurations')
          .update({
            term_name: term.term_name,
            term_number: term.term_number,
            start_date: term.start_date,
            end_date: term.end_date,
            next_term_start_date: term.next_term_start_date || null,
            fees_balance_note: term.fees_balance_note || null,
            fees_next_term: term.fees_next_term || null,
            other_requirements: term.other_requirements || null,
            is_current: term.is_current,
          })
          .eq('id', term.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('term_configurations')
          .insert([{
            academic_year_id: term.academic_year_id,
            term_name: term.term_name,
            term_number: term.term_number,
            start_date: term.start_date,
            end_date: term.end_date,
            next_term_start_date: term.next_term_start_date || null,
            fees_balance_note: term.fees_balance_note || null,
            fees_next_term: term.fees_next_term || null,
            other_requirements: term.other_requirements || null,
            is_current: term.is_current,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Term configuration saved');
      queryClient.invalidateQueries({ queryKey: ['term-configurations'] });
      setIsDialogOpen(false);
      setFormData(defaultTerm);
      setEditingTerm(null);
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('term_configurations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Term configuration deleted');
      queryClient.invalidateQueries({ queryKey: ['term-configurations'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const openAddDialog = () => {
    setEditingTerm(null);
    setFormData({
      ...defaultTerm,
      academic_year_id: academicYears?.find(y => y.is_current)?.id || '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (term: any) => {
    setEditingTerm(term);
    setFormData({
      id: term.id,
      academic_year_id: term.academic_year_id,
      term_name: term.term_name,
      term_number: term.term_number,
      start_date: term.start_date,
      end_date: term.end_date,
      next_term_start_date: term.next_term_start_date || '',
      fees_balance_note: term.fees_balance_note || '',
      fees_next_term: term.fees_next_term || '',
      other_requirements: term.other_requirements || '',
      is_current: term.is_current,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.academic_year_id || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Term Configurations
            </CardTitle>
            <CardDescription>
              Configure term dates and information for report cards
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Term
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTerm ? 'Edit Term Configuration' : 'Add Term Configuration'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Academic Year *</Label>
                    <Select
                      value={formData.academic_year_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, academic_year_id: v }))}
                      disabled={!!editingTerm}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears?.map(year => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name} {year.is_current && '(Current)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Term *</Label>
                    <Select
                      value={formData.term_name}
                      onValueChange={(v) => setFormData(prev => ({ 
                        ...prev, 
                        term_name: v,
                        term_number: parseInt(v.replace('Term ', '')) || 1
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Next Term Start Date</Label>
                  <Input
                    type="date"
                    value={formData.next_term_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_term_start_date: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fees Balance Note</Label>
                    <Input
                      value={formData.fees_balance_note}
                      onChange={(e) => setFormData(prev => ({ ...prev, fees_balance_note: e.target.value }))}
                      placeholder="e.g., UGX 500,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fees Next Term</Label>
                    <Input
                      value={formData.fees_next_term}
                      onChange={(e) => setFormData(prev => ({ ...prev, fees_next_term: e.target.value }))}
                      placeholder="e.g., UGX 1,200,000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Other Requirements</Label>
                  <Textarea
                    value={formData.other_requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, other_requirements: e.target.value }))}
                    placeholder="Any other requirements for the next term..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_current}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_current: v }))}
                  />
                  <Label>Current Term</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
            </div>
          ) : termConfigs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No term configurations found. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Next Term</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termConfigs?.map((term: any) => (
                  <TableRow key={term.id}>
                    <TableCell>{term.academic_years?.name}</TableCell>
                    <TableCell className="font-medium">{term.term_name}</TableCell>
                    <TableCell>{format(new Date(term.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(term.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {term.next_term_start_date 
                        ? format(new Date(term.next_term_start_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {term.is_current && (
                        <Badge className="bg-green-500">Current</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(term)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this term configuration?')) {
                              deleteMutation.mutate(term.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TermConfiguration;