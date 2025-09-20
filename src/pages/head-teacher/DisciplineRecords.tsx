import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddBehaviorNoteDialog from '@/components/AddBehaviorNoteDialog';

interface BehaviorNote {
  id: string;
  student_id: string;
  date: string;
  category: string;
  note_type: string;
  description: string;
  recorded_by: string;
  is_private: boolean;
  student?: {
    student_id: string;
    profile?: {
      first_name: string;
      last_name: string;
    };
  };
  recorded_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

const DisciplineRecords = () => {
  const [behaviorNotes, setBehaviorNotes] = useState<BehaviorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBehaviorNotes();
  }, []);

  const fetchBehaviorNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_notes')
        .select(`
          *,
          student:students!behavior_notes_student_id_fkey(
            student_id,
            profile:profiles!students_profile_id_fkey(
              first_name,
              last_name
            )
          ),
          recorded_by_profile:profiles!behavior_notes_recorded_by_fkey(
            first_name,
            last_name
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch discipline records"
        });
        return;
      }

      setBehaviorNotes(data || []);
    } catch (error) {
      console.error('Error fetching behavior notes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'disciplinary':
        return 'destructive';
      case 'positive':
        return 'default';
      case 'academic':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'incident':
        return <AlertTriangle className="h-4 w-4" />;
      case 'achievement':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Discipline Records</h1>
          <p className="text-muted-foreground">View and manage student behavior records</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      <div className="grid gap-4">
        {behaviorNotes.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                <p className="text-muted-foreground">No discipline records have been created yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          behaviorNotes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(note.note_type)}
                    <CardTitle className="text-lg">
                      {note.student?.profile?.first_name} {note.student?.profile?.last_name}
                    </CardTitle>
                    <Badge variant={getCategoryColor(note.category)}>
                      {note.category}
                    </Badge>
                    <Badge variant="outline">{note.note_type}</Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(note.date).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{note.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Recorded by: {note.recorded_by_profile?.first_name} {note.recorded_by_profile?.last_name}
                  </div>
                  {note.is_private && (
                    <Badge variant="secondary" className="text-xs">Private</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddBehaviorNoteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchBehaviorNotes}
      />
    </div>
  );
};

export default DisciplineRecords;