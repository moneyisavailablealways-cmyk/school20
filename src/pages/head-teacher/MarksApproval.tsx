import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileCheck, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';

interface MarkSubmission {
  id: string;
  subject_id: string;
  subject_name: string;
  class_name: string;
  teacher_id: string;
  teacher_name: string;
  student_count: number;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  average_score: number;
  term: string;
}

const MarksApproval = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<MarkSubmission | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submissions, setSubmissions] = useState<MarkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      // Fetch all submissions grouped by subject
      const { data: rawSubmissions, error } = await supabase
        .from('subject_submissions')
        .select('id, subject_id, submitted_by, submitted_at, status, marks, term')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (!rawSubmissions || rawSubmissions.length === 0) {
        setSubmissions([]);
        return;
      }

      // Group by subject_id and submitted_by to get unique submissions
      const groupedSubmissions = new Map<string, typeof rawSubmissions>();
      rawSubmissions.forEach(sub => {
        const key = `${sub.subject_id}-${sub.submitted_by}-${sub.status}`;
        if (!groupedSubmissions.has(key)) {
          groupedSubmissions.set(key, []);
        }
        groupedSubmissions.get(key)!.push(sub);
      });

      // Get unique IDs for fetching related data
      const subjectIds = [...new Set(rawSubmissions.map(s => s.subject_id))];
      const teacherIds = [...new Set(rawSubmissions.map(s => s.submitted_by))];

      // Fetch subjects with level_id
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, level_id')
        .in('id', subjectIds);

      // Fetch teachers
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds);

      // Get level IDs from subjects
      const levelIds = [...new Set(subjects?.map(s => s.level_id).filter(Boolean) || [])];

      // Fetch levels
      const { data: levels } = await supabase
        .from('levels')
        .select('id, name')
        .in('id', levelIds);

      // Build maps
      const subjectMap = new Map(subjects?.map(s => [s.id, s]) || []);
      const teacherMap = new Map(teachers?.map(t => [t.id, t]) || []);
      const levelMap = new Map(levels?.map(l => [l.id, l]) || []);

      // Build submission list
      const submissionList: MarkSubmission[] = [];
      
      groupedSubmissions.forEach((subs, key) => {
        const firstSub = subs[0];
        const subject = subjectMap.get(firstSub.subject_id);
        const teacher = teacherMap.get(firstSub.submitted_by);
        const levelInfo = subject?.level_id ? levelMap.get(subject.level_id) : null;

        // Calculate average score
        const scores = subs.map(s => Number(s.marks) || 0).filter(m => m > 0);
        const avgScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
          : 0;

        submissionList.push({
          id: firstSub.id,
          subject_id: firstSub.subject_id,
          subject_name: subject?.name || 'Unknown Subject',
          class_name: levelInfo?.name || 'Unknown Level',
          teacher_id: firstSub.submitted_by,
          teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher',
          student_count: subs.length,
          submitted_at: firstSub.submitted_at,
          status: firstSub.status as 'pending' | 'approved' | 'rejected',
          average_score: avgScore,
          term: firstSub.term || 'Term 1',
        });
      });

      // Sort by submitted_at descending
      submissionList.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

      setSubmissions(submissionList);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleApprove = async (submission: MarkSubmission) => {
    try {
      setProcessing(true);

      // Update all submissions for this subject/teacher to approved
      const { error } = await supabase
        .from('subject_submissions')
        .update({ 
          status: 'approved',
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('subject_id', submission.subject_id)
        .eq('submitted_by', submission.teacher_id)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: 'Marks Approved',
        description: `Marks for ${submission.subject_name} have been approved.`,
      });

      setSelectedSubmission(null);
      setReviewComment('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error approving marks:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve marks',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (submission: MarkSubmission) => {
    if (!reviewComment.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);

      // Update all submissions for this subject/teacher to rejected
      const { error } = await supabase
        .from('subject_submissions')
        .update({ 
          status: 'rejected',
          rejection_reason: reviewComment,
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('subject_id', submission.subject_id)
        .eq('submitted_by', submission.teacher_id)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: 'Marks Rejected',
        description: `Marks for ${submission.subject_name} have been rejected and returned to the teacher.`,
        variant: 'destructive',
      });

      setSelectedSubmission(null);
      setReviewComment('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting marks:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject marks',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission =>
    submission.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending');
  const completedSubmissions = filteredSubmissions.filter(s => s.status !== 'pending');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marks Approval</h1>
        <p className="text-muted-foreground">
          Review and approve teacher mark submissions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSubmissions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter(s => s.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter(s => s.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.length > 0 
                ? Math.round(submissions.reduce((acc, s) => acc + s.average_score, 0) / submissions.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by subject, class, or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Submissions List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingSubmissions.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedSubmissions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No pending submissions
                  </CardContent>
                </Card>
              ) : (
                pendingSubmissions.map((submission) => (
                  <Card key={`${submission.subject_id}-${submission.teacher_id}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{submission.subject_name}</h3>
                            <Badge variant="outline">{submission.term}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span>Class: </span>
                              <span className="font-medium">{submission.class_name}</span>
                            </div>
                            <div>
                              <span>Teacher: </span>
                              <span className="font-medium">{submission.teacher_name}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <span className={getScoreColor(submission.average_score)}>
                                Avg: {submission.average_score}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {submission.student_count} students
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Submitted {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No completed submissions
                  </CardContent>
                </Card>
              ) : (
                completedSubmissions.map((submission) => (
                  <Card key={`${submission.subject_id}-${submission.teacher_id}-${submission.status}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{submission.subject_name}</h3>
                            <Badge className={`text-xs px-2 py-0 ${getStatusColor(submission.status)}`}>
                              {submission.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span>Class: </span>
                              <span className="font-medium">{submission.class_name}</span>
                            </div>
                            <div>
                              <span>Teacher: </span>
                              <span className="font-medium">{submission.teacher_name}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <span className={getScoreColor(submission.average_score)}>
                              Avg: {submission.average_score}%
                            </span>
                            <span className="text-muted-foreground">
                              {submission.student_count} students
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Review Panel */}
        <div>
          {selectedSubmission ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Review Submission</span>
                </CardTitle>
                <CardDescription>Review and approve or reject marks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{selectedSubmission.subject_name}</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{selectedSubmission.class_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teacher:</span>
                      <span>{selectedSubmission.teacher_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Term:</span>
                      <span>{selectedSubmission.term}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Students:</span>
                      <span>{selectedSubmission.student_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted:</span>
                      <span className="text-xs">
                        {format(new Date(selectedSubmission.submitted_at), 'PPp')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3">Performance</h5>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Score:</span>
                    <span className={`font-medium ${getScoreColor(selectedSubmission.average_score)}`}>
                      {selectedSubmission.average_score}%
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="text-sm font-medium">
                    Review Comment
                  </label>
                  <Textarea
                    id="comment"
                    placeholder="Add comments (required for rejection)..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleApprove(selectedSubmission)}
                    className="flex-1"
                    disabled={processing}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedSubmission)}
                    className="flex-1"
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedSubmission(null);
                    setReviewComment('');
                  }}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a submission to review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksApproval;
