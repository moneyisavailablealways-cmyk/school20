import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageSquareText, Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const DEFAULT_RULES = [
  { min_score: 90, max_score: 100, comment_text: 'Excellent performance. Keep aiming higher and maintaining this outstanding level of achievement.', priority: 5 },
  { min_score: 75, max_score: 89.99, comment_text: 'Very good work. You have shown great dedication. Maintain this consistency and strive for excellence.', priority: 4 },
  { min_score: 60, max_score: 74.99, comment_text: 'Good effort shown this term. Continue working hard and you will achieve even greater results.', priority: 3 },
  { min_score: 45, max_score: 59.99, comment_text: 'Fair performance. More effort and dedication are needed to improve your academic standing.', priority: 2 },
  { min_score: 0, max_score: 44.99, comment_text: 'Needs serious improvement. You must work much harder next term. Seek extra help from your teachers.', priority: 1 },
];

const AutoCommentRules = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({ min_score: '', max_score: '', comment_text: '' });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['auto-comment-rules'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.school_id) return [];

      const { data, error } = await supabase
        .from('auto_comment_rules' as any)
        .select('*')
        .eq('school_id', profile.school_id)
        .order('max_score', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (rule: { min_score: number; max_score: number; comment_text: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.school_id) throw new Error('School not found');

      const { error } = await supabase
        .from('auto_comment_rules' as any)
        .insert([{
          school_id: profile.school_id,
          min_score: rule.min_score,
          max_score: rule.max_score,
          comment_text: rule.comment_text,
          priority: Math.floor(rule.min_score / 10),
          is_active: true,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Comment rule added');
      queryClient.invalidateQueries({ queryKey: ['auto-comment-rules'] });
      setDialogOpen(false);
      setNewRule({ min_score: '', max_score: '', comment_text: '' });
    },
    onError: (error: any) => {
      toast.error(`Failed to add rule: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auto_comment_rules' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rule deleted');
      queryClient.invalidateQueries({ queryKey: ['auto-comment-rules'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('auto_comment_rules' as any)
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-comment-rules'] });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.school_id) throw new Error('School not found');

      const payload = DEFAULT_RULES.map(r => ({
        ...r,
        school_id: profile.school_id,
        is_active: true,
      }));

      const { error } = await supabase
        .from('auto_comment_rules' as any)
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Default comment rules added');
      queryClient.invalidateQueries({ queryKey: ['auto-comment-rules'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to seed defaults: ${error.message}`);
    },
  });

  const handleAddRule = () => {
    const min = parseFloat(newRule.min_score);
    const max = parseFloat(newRule.max_score);
    if (isNaN(min) || isNaN(max) || !newRule.comment_text.trim()) {
      toast.error('Please fill all fields correctly');
      return;
    }
    if (min > max) {
      toast.error('Minimum score cannot exceed maximum score');
      return;
    }
    addMutation.mutate({ min_score: min, max_score: max, comment_text: newRule.comment_text });
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5" />
              Auto Class Teacher Comments
            </CardTitle>
            <CardDescription>
              Configure automatic comments that are generated based on a student's overall average score. 
              Class teachers can still edit or replace these comments.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {(!rules || rules.length === 0) && (
              <Button variant="outline" size="sm" onClick={() => seedDefaultsMutation.mutate()}>
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Load Defaults
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Comment Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Score (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newRule.min_score}
                        onChange={(e) => setNewRule(prev => ({ ...prev, min_score: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Score (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newRule.max_score}
                        onChange={(e) => setNewRule(prev => ({ ...prev, max_score: e.target.value }))}
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Comment Text</Label>
                    <Textarea
                      value={newRule.comment_text}
                      onChange={(e) => setNewRule(prev => ({ ...prev, comment_text: e.target.value }))}
                      placeholder="Enter the comment that will appear on the report card..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAddRule} disabled={addMutation.isPending} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save Rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rules && rules.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Score Range</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-[80px]">Active</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {rule.min_score}% – {rule.max_score}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{rule.comment_text}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquareText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No comment rules configured</p>
            <p className="text-sm mt-1">Click "Load Defaults" to add standard Uganda O-Level comment rules, or add your own.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoCommentRules;
