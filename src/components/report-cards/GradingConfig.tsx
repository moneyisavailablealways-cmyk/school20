import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';

interface GradeConfig {
  id?: string;
  name: string;
  min_marks: number;
  max_marks: number;
  grade: string;
  grade_points: number;
  remark: string;
  division_contribution: number;
  is_active: boolean;
}

const defaultGrade: GradeConfig = {
  name: '',
  min_marks: 0,
  max_marks: 100,
  grade: '',
  grade_points: 1,
  remark: '',
  division_contribution: 1,
  is_active: true,
};

const GradingConfig = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeConfig | null>(null);
  const [formData, setFormData] = useState<GradeConfig>(defaultGrade);

  // Fetch grading config
  const { data: gradingConfig, isLoading } = useQuery({
    queryKey: ['grading-config-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_config')
        .select('*')
        .order('min_marks', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: GradeConfig) => {
      if (data.id) {
        const { error } = await supabase
          .from('grading_config')
          .update(data)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grading_config')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingGrade ? 'Grade updated' : 'Grade added');
      setIsDialogOpen(false);
      setEditingGrade(null);
      setFormData(defaultGrade);
      queryClient.invalidateQueries({ queryKey: ['grading-config-admin'] });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grading_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grade deleted');
      queryClient.invalidateQueries({ queryKey: ['grading-config-admin'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('grading_config')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-config-admin'] });
    },
  });

  const openEditDialog = (grade: GradeConfig) => {
    setEditingGrade(grade);
    setFormData(grade);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingGrade(null);
    setFormData(defaultGrade);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.grade) {
      toast.error('Please fill all required fields');
      return;
    }
    saveMutation.mutate({ ...formData, id: editingGrade?.id });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Grading Configuration
              </CardTitle>
              <CardDescription>
                Configure grade boundaries for O-Level report cards
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Grade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGrade ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
                  <DialogDescription>
                    Configure grade boundaries and points
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Distinction 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Input
                        value={formData.grade}
                        onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                        placeholder="e.g., D1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Marks</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.min_marks}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_marks: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Marks</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.max_marks}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_marks: parseInt(e.target.value) || 100 }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Grade Points</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="9"
                        value={formData.grade_points}
                        onChange={(e) => setFormData(prev => ({ ...prev, grade_points: parseFloat(e.target.value) || 1 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Division Points</Label>
                      <Input
                        type="number"
                        min="1"
                        max="9"
                        value={formData.division_contribution}
                        onChange={(e) => setFormData(prev => ({ ...prev, division_contribution: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remark</Label>
                    <Input
                      value={formData.remark}
                      onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                      placeholder="e.g., Excellent"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Marks Range</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradingConfig?.map(grade => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.name}</TableCell>
                    <TableCell>
                      <Badge>{grade.grade}</Badge>
                    </TableCell>
                    <TableCell>{grade.min_marks} - {grade.max_marks}</TableCell>
                    <TableCell>{grade.grade_points}</TableCell>
                    <TableCell>{grade.remark}</TableCell>
                    <TableCell>
                      <Switch
                        checked={grade.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: grade.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(grade)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(grade.id)}
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
        </CardContent>
      </Card>

      {/* Division Calculation Info */}
      <Card>
        <CardHeader>
          <CardTitle>O-Level Division Calculation</CardTitle>
          <CardDescription>How divisions are calculated from best 8 subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">Division I</p>
              <p className="text-sm text-muted-foreground">8 - 32 points</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">Division II</p>
              <p className="text-sm text-muted-foreground">33 - 45 points</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">Division III</p>
              <p className="text-sm text-muted-foreground">46 - 58 points</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">Division IV</p>
              <p className="text-sm text-muted-foreground">59 - 72 points</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">Ungraded</p>
              <p className="text-sm text-muted-foreground">Above 72 points</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradingConfig;
