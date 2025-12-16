import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  User
} from 'lucide-react';

interface ChildLibraryData {
  childId: string;
  childName: string;
  borrowedBooks: any[];
  fines: any[];
  reservations: any[];
}

const ChildrenLibrary = () => {
  const { profile } = useAuth();

  // Fetch children linked to this parent
  const { data: childrenData, isLoading } = useQuery({
    queryKey: ['parent-children-library', profile?.id],
    queryFn: async () => {
      // Get linked children
      const { data: relationships, error: relError } = await supabase
        .from('parent_student_relationships')
        .select('student_id')
        .eq('parent_id', profile?.id);

      if (relError) throw relError;
      if (!relationships || relationships.length === 0) return [];

      const studentIds = relationships.map(r => r.student_id);

      // Get student details with profiles
      const { data: students, error: studError } = await supabase
        .from('students')
        .select('id, profile_id, profiles (id, first_name, last_name)')
        .in('id', studentIds);

      if (studError) throw studError;
      if (!students) return [];

      // Fetch library data for each child
      const childrenLibraryData: ChildLibraryData[] = [];

      for (const student of students) {
        const profileId = student.profiles?.id;
        if (!profileId) continue;

        // Fetch borrowed books
        const { data: borrowed } = await supabase
          .from('library_transactions')
          .select(`
            *,
            library_items (title, author, item_type, subject, category)
          `)
          .eq('borrower_id', profileId)
          .eq('transaction_type', 'borrow')
          .order('issue_date', { ascending: false });

        // Fetch fines
        const { data: fines } = await supabase
          .from('library_fines')
          .select('*')
          .eq('borrower_id', profileId)
          .eq('is_paid', false);

        // Fetch reservations
        const { data: reservations } = await supabase
          .from('library_reservations')
          .select(`
            *,
            library_items (title, author, category)
          `)
          .eq('reserver_id', profileId)
          .eq('status', 'active');

        childrenLibraryData.push({
          childId: student.id,
          childName: `${student.profiles?.first_name} ${student.profiles?.last_name}`,
          borrowedBooks: borrowed || [],
          fines: fines || [],
          reservations: reservations || []
        });
      }

      return childrenLibraryData;
    },
    enabled: !!profile?.id
  });

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  
  const getDaysUntilDue = (dueDate: string) => {
    return Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatus = (transaction: any) => {
    if (transaction.return_date) return 'returned';
    if (isOverdue(transaction.due_date)) return 'overdue';
    if (getDaysUntilDue(transaction.due_date) <= 3) return 'due_soon';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'returned':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> Returned</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      case 'due_soon':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Due Soon</Badge>;
      default:
        return <Badge variant="default">Active</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Children's Library</h1>
          <p className="text-muted-foreground mt-2">
            View your children's borrowed books and library activity
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!childrenData || childrenData.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Children's Library</h1>
          <p className="text-muted-foreground mt-2">
            View your children's borrowed books and library activity
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Children Linked</h3>
            <p className="text-muted-foreground text-center">
              No children are linked to your account yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Children's Library</h1>
        <p className="text-muted-foreground mt-2">
          View your children's borrowed books and library activity
        </p>
      </div>

      <Tabs defaultValue={childrenData[0]?.childId} className="w-full">
        <TabsList className="mb-4">
          {childrenData.map((child) => (
            <TabsTrigger key={child.childId} value={child.childId}>
              <User className="h-4 w-4 mr-2" />
              {child.childName}
            </TabsTrigger>
          ))}
        </TabsList>

        {childrenData.map((child) => {
          const totalFines = child.fines.reduce((sum, fine) => sum + Number(fine.amount), 0);
          const activeBooks = child.borrowedBooks.filter(b => !b.return_date);
          const overdueBooks = activeBooks.filter(b => isOverdue(b.due_date));

          return (
            <TabsContent key={child.childId} value={child.childId} className="space-y-6">
              {/* Quick Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Books Borrowed</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold">{activeBooks.length}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`h-5 w-5 ${overdueBooks.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
                      <span className="text-sm font-medium">Overdue</span>
                    </div>
                    <div className="mt-2">
                      <div className={`text-2xl font-bold ${overdueBooks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {overdueBooks.length}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Reservations</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold">{child.reservations.length}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`h-5 w-5 ${totalFines > 0 ? 'text-red-500' : 'text-green-500'}`} />
                      <span className="text-sm font-medium">Outstanding Fines</span>
                    </div>
                    <div className="mt-2">
                      <div className={`text-2xl font-bold ${totalFines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${totalFines.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Currently Borrowed Books */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Currently Borrowed Books
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeBooks.length > 0 ? (
                    <div className="space-y-4">
                      {activeBooks.map((transaction) => {
                        const status = getStatus(transaction);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{transaction.library_items?.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                by {transaction.library_items?.author || 'Unknown Author'}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {transaction.library_items?.item_type && (
                                  <Badge variant="outline">{transaction.library_items.item_type}</Badge>
                                )}
                                {transaction.library_items?.subject && (
                                  <Badge variant="outline">{transaction.library_items.subject}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Borrowed: {new Date(transaction.issue_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>Due: {new Date(transaction.due_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(status)}
                              {status !== 'returned' && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  {getDaysUntilDue(transaction.due_date)} days {getDaysUntilDue(transaction.due_date) < 0 ? 'overdue' : 'left'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No books currently borrowed</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Borrowing History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Borrowing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {child.borrowedBooks.filter(b => b.return_date).length > 0 ? (
                    <div className="space-y-4">
                      {child.borrowedBooks.filter(b => b.return_date).slice(0, 10).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                          <div className="flex-1">
                            <h4 className="font-medium">{transaction.library_items?.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              by {transaction.library_items?.author || 'Unknown Author'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Borrowed: {new Date(transaction.issue_date).toLocaleDateString()}</span>
                              <span>Returned: {new Date(transaction.return_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" /> Returned
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No borrowing history</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Outstanding Fines */}
              {child.fines.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Outstanding Fines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {child.fines.map((fine) => (
                        <div key={fine.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{fine.fine_type}</h4>
                            <p className="text-sm text-muted-foreground">{fine.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Date: {new Date(fine.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-lg font-bold text-red-600">${Number(fine.amount).toFixed(2)}</div>
                        </div>
                      ))}
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total Outstanding:</span>
                          <span className="text-xl font-bold text-red-600">${totalFines.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default ChildrenLibrary;
