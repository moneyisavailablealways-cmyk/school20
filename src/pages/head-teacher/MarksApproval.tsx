import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface MarkSubmission {
  id: string;
  title: string;
  subject: string;
  class: string;
  teacher: string;
  assessmentType: string;
  studentsCount: number;
  submittedDate: string;
  dueDate: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  averageScore: number;
  passRate: number;
}

const MarksApproval = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<MarkSubmission | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const markSubmissions: MarkSubmission[] = [
    {
      id: '1',
      title: 'Mathematics Final Exam - Term 1',
      subject: 'Mathematics',
      class: 'Grade 10A',
      teacher: 'Mr. Johnson',
      assessmentType: 'Final Exam',
      studentsCount: 28,
      submittedDate: '2024-01-15',
      dueDate: '2024-01-17',
      status: 'pending',
      priority: 'high',
      averageScore: 78.5,
      passRate: 85.7,
    },
    {
      id: '2',
      title: 'English Literature Essay Assignment',
      subject: 'English Literature',
      class: 'Grade 11B',
      teacher: 'Ms. Smith',
      assessmentType: 'Assignment',
      studentsCount: 25,
      submittedDate: '2024-01-14',
      dueDate: '2024-01-18',
      status: 'pending',
      priority: 'medium',
      averageScore: 82.3,
      passRate: 92.0,
    },
    {
      id: '3',
      title: 'Physics Lab Reports - Mechanics',
      subject: 'Physics',
      class: 'Grade 12A',
      teacher: 'Dr. Brown',
      assessmentType: 'Lab Report',
      studentsCount: 22,
      submittedDate: '2024-01-13',
      dueDate: '2024-01-16',
      status: 'pending',
      priority: 'low',
      averageScore: 75.8,
      passRate: 81.8,
    },
    {
      id: '4',
      title: 'Chemistry Midterm Test',
      subject: 'Chemistry',
      class: 'Grade 11A',
      teacher: 'Dr. Wilson',
      assessmentType: 'Test',
      studentsCount: 30,
      submittedDate: '2024-01-12',
      dueDate: '2024-01-15',
      status: 'approved',
      priority: 'medium',
      averageScore: 84.2,
      passRate: 93.3,
    },
    {
      id: '5',
      title: 'History Research Project',
      subject: 'History',
      class: 'Grade 9C',
      teacher: 'Mrs. Davis',
      assessmentType: 'Project',
      studentsCount: 26,
      submittedDate: '2024-01-11',
      dueDate: '2024-01-14',
      status: 'rejected',
      priority: 'high',
      averageScore: 65.4,
      passRate: 69.2,
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleApprove = async (submissionId: string) => {
    toast({
      title: 'Marks Approved',
      description: 'The marks have been approved and will be forwarded to the principal.',
    });
    setSelectedSubmission(null);
    setReviewComment('');
  };

  const handleReject = async (submissionId: string) => {
    if (!reviewComment.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Marks Rejected',
      description: 'The marks have been rejected and returned to the teacher.',
      variant: 'destructive',
    });
    setSelectedSubmission(null);
    setReviewComment('');
  };

  const filteredSubmissions = markSubmissions.filter(submission =>
    submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.teacher.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending');
  const completedSubmissions = filteredSubmissions.filter(s => s.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marks Approval</h1>
        <p className="text-muted-foreground">
          Review and approve teacher mark submissions before forwarding to principal
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
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingSubmissions.filter(s => s.priority === 'high').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedSubmissions.filter(s => s.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Pass Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(markSubmissions.reduce((acc, s) => acc + s.passRate, 0) / markSubmissions.length)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by assessment title, subject, or teacher..."
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
              {pendingSubmissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{submission.title}</h3>
                          <Badge className={`text-xs px-2 py-0 ${getPriorityColor(submission.priority)}`}>
                            {submission.priority.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span>Subject: </span>
                            <span className="font-medium">{submission.subject}</span>
                          </div>
                          <div>
                            <span>Class: </span>
                            <span className="font-medium">{submission.class}</span>
                          </div>
                          <div>
                            <span>Teacher: </span>
                            <span className="font-medium">{submission.teacher}</span>
                          </div>
                          <div>
                            <span>Type: </span>
                            <span className="font-medium">{submission.assessmentType}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className={getScoreColor(submission.averageScore)}>
                              Avg: {submission.averageScore}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span>Pass Rate: {submission.passRate}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Students: {submission.studentsCount}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Submitted: {submission.submittedDate}</span>
                          <span className="text-red-600">Due: {submission.dueDate}</span>
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
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{submission.title}</h3>
                          <Badge className={`text-xs px-2 py-0 ${getStatusColor(submission.status)}`}>
                            {submission.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span>Subject: </span>
                            <span className="font-medium">{submission.subject}</span>
                          </div>
                          <div>
                            <span>Teacher: </span>
                            <span className="font-medium">{submission.teacher}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={getScoreColor(submission.averageScore)}>
                            Avg: {submission.averageScore}%
                          </span>
                          <span>Pass Rate: {submission.passRate}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  <h4 className="font-medium mb-2">{selectedSubmission.title}</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject:</span>
                      <span>{selectedSubmission.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{selectedSubmission.class}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teacher:</span>
                      <span>{selectedSubmission.teacher}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{selectedSubmission.assessmentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Students:</span>
                      <span>{selectedSubmission.studentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge className={`text-xs ${getPriorityColor(selectedSubmission.priority)}`}>
                        {selectedSubmission.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3">Performance Metrics</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Score:</span>
                      <span className={`font-medium ${getScoreColor(selectedSubmission.averageScore)}`}>
                        {selectedSubmission.averageScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pass Rate:</span>
                      <span className="font-medium">{selectedSubmission.passRate}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="text-sm font-medium">
                    Review Comment
                  </label>
                  <Textarea
                    id="comment"
                    placeholder="Add your review comments here..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedSubmission.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmission(null)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Submission Selected</h3>
                <p className="text-muted-foreground text-center">
                  Select a mark submission from the list to review and approve.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksApproval;