import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Users, 
  DollarSign, 
  Shield,
  AlertTriangle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  dueDate?: string;
}

const ApprovalsCenter = () => {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const approvalItems: ApprovalItem[] = [
    {
      id: '1',
      type: 'Report Cards',
      title: 'Grade 12 Final Report Cards - Q4 2024',
      description: 'Final semester report cards for Grade 12 students ready for principal approval before release to parents.',
      submittedBy: 'Ms. Johnson (Academic Coordinator)',
      submittedDate: '2024-01-15',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-01-17',
    },
    {
      id: '2',
      type: 'Policy',
      title: 'Updated Student Code of Conduct',
      description: 'Revised student behavioral guidelines including new digital citizenship policies.',
      submittedBy: 'Mr. Smith (Vice Principal)',
      submittedDate: '2024-01-14',
      priority: 'medium',
      status: 'pending',
    },
    {
      id: '3',
      type: 'Budget',
      title: 'Technology Equipment Purchase Request',
      description: 'Request for approval to purchase new computer lab equipment - $45,000.',
      submittedBy: 'IT Department',
      submittedDate: '2024-01-13',
      priority: 'medium',
      status: 'pending',
    },
    {
      id: '4',
      type: 'Staff',
      title: 'New Teacher Hiring Recommendation',
      description: 'Recommendation to hire Sarah Williams as Mathematics teacher.',
      submittedBy: 'HR Department',
      submittedDate: '2024-01-12',
      priority: 'high',
      status: 'pending',
    },
    {
      id: '5',
      type: 'Academic',
      title: 'Curriculum Modification - Science Department',
      description: 'Proposed changes to Grade 10 Chemistry curriculum to align with new standards.',
      submittedBy: 'Dr. Brown (Science Head)',
      submittedDate: '2024-01-11',
      priority: 'low',
      status: 'approved',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'report cards': return FileText;
      case 'policy': return Shield;
      case 'budget': return DollarSign;
      case 'staff': return Users;
      case 'academic': return FileText;
      default: return FileText;
    }
  };

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

  const handleApprove = async (itemId: string) => {
    // In a real app, this would make an API call
    toast({
      title: 'Item Approved',
      description: 'The approval request has been approved successfully.',
    });
    setSelectedItem(null);
    setReviewComment('');
  };

  const handleReject = async (itemId: string) => {
    if (!reviewComment.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    // In a real app, this would make an API call
    toast({
      title: 'Item Rejected',
      description: 'The approval request has been rejected.',
      variant: 'destructive',
    });
    setSelectedItem(null);
    setReviewComment('');
  };

  const pendingItems = approvalItems.filter(item => item.status === 'pending');
  const completedItems = approvalItems.filter(item => item.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals Center</h1>
        <p className="text-muted-foreground">
          Review and approve pending requests requiring principal authorization
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
            <div className="text-2xl font-bold">{pendingItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingItems.filter(item => item.priority === 'high').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Approvals List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingItems.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingItems.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <TypeIcon className="h-5 w-5 text-muted-foreground mt-1" />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{item.title}</h3>
                              <Badge className={`text-xs px-2 py-0 ${getPriorityColor(item.priority)}`}>
                                {item.priority.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>By: {item.submittedBy}</span>
                              <span>Submitted: {item.submittedDate}</span>
                              {item.dueDate && (
                                <span className="text-red-600">Due: {item.dueDate}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedItems.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <TypeIcon className="h-5 w-5 text-muted-foreground mt-1" />
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{item.title}</h3>
                              <Badge className={`text-xs px-2 py-0 ${getStatusColor(item.status)}`}>
                                {item.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>By: {item.submittedBy}</span>
                              <span>Submitted: {item.submittedDate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>

        {/* Review Panel */}
        <div>
          {selectedItem ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Review Item</span>
                </CardTitle>
                <CardDescription>Review and approve or reject this request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{selectedItem.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{selectedItem.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{selectedItem.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted by:</span>
                      <span>{selectedItem.submittedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{selectedItem.submittedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge className={`text-xs ${getPriorityColor(selectedItem.priority)}`}>
                        {selectedItem.priority.toUpperCase()}
                      </Badge>
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
                    onClick={() => handleApprove(selectedItem.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedItem.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Item Selected</h3>
                <p className="text-muted-foreground text-center">
                  Select an approval item from the list to review and take action.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalsCenter;