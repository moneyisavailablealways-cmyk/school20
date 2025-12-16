import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { GraduationCap, Plus, Search, Award, Users, Edit, Trash2 } from 'lucide-react';

const Scholarships = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isCreateScholarshipOpen, setIsCreateScholarshipOpen] = useState(false);
  const [isAwardScholarshipOpen, setIsAwardScholarshipOpen] = useState(false);
  const queryClient = useQueryClient();
  const scholarshipForm = useForm({
    defaultValues: {
      name: '',
      type: '',
      value: '',
      max_recipients: '',
      criteria: '',
      description: ''
    }
  });
  const awardForm = useForm({
    defaultValues: {
      student_id: '',
      scholarship_id: '',
      amount: '',
      notes: ''
    }
  });

  // Fetch scholarships
  const { data: scholarships = [], isLoading: isLoadingScholarships } = useQuery({
    queryKey: ['scholarships', searchTerm, selectedType],
    queryFn: async () => {
      let query = supabase
        .from('scholarships')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (selectedType !== 'all') {
        query = query.eq('type', selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch student scholarships with sequential pattern
  const { data: studentScholarships = [], isLoading: isLoadingStudentScholarships } = useQuery({
    queryKey: ['student-scholarships'],
    queryFn: async () => {
      const { data: awardsData, error } = await supabase
        .from('student_scholarships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!awardsData || awardsData.length === 0) return [];

      // Get unique IDs
      const studentIds = [...new Set(awardsData.map(a => a.student_id).filter(Boolean))];
      const scholarshipIds = [...new Set(awardsData.map(a => a.scholarship_id).filter(Boolean))];

      // Fetch students
      const { data: students } = await supabase
        .from('students')
        .select('id, student_id, profile_id')
        .in('id', studentIds);

      // Fetch profiles
      const profileIds = [...new Set((students || []).map(s => s.profile_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', profileIds);

      // Fetch scholarships
      const { data: scholarshipsData } = await supabase
        .from('scholarships')
        .select('id, name, type')
        .in('id', scholarshipIds);

      // Create lookup maps
      const studentMap = new Map((students || []).map(s => [s.id, s]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const scholarshipMap = new Map((scholarshipsData || []).map(s => [s.id, s]));

      return awardsData.map(award => {
        const student = studentMap.get(award.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        const scholarship = scholarshipMap.get(award.scholarship_id);
        return {
          ...award,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          studentIdNumber: student?.student_id || '',
          scholarshipName: scholarship?.name || 'Unknown',
          scholarshipType: scholarship?.type || ''
        };
      });
    }
  });

  // Fetch active students for awarding scholarships
  const { data: students = [] } = useQuery({
    queryKey: ['students-for-scholarships'],
    queryFn: async () => {
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('id, student_id, profile_id')
        .eq('enrollment_status', 'active');
      
      if (error) throw error;
      if (!studentsData || studentsData.length === 0) return [];

      // Fetch profiles
      const profileIds = [...new Set(studentsData.map(s => s.profile_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', profileIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return studentsData.map(student => {
        const profile = profileMap.get(student.profile_id);
        return {
          ...student,
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student'
        };
      });
    }
  });

  const createScholarshipMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('scholarships')
        .insert({
          name: data.name,
          description: data.description || null,
          type: data.type,
          value: parseFloat(data.value),
          criteria: data.criteria || null,
          max_recipients: data.max_recipients ? parseInt(data.max_recipients.toString()) : null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      setIsCreateScholarshipOpen(false);
      scholarshipForm.reset();
      toast.success('Scholarship created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create scholarship');
      console.error('Error creating scholarship:', error);
    }
  });

  const awardScholarshipMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('student_scholarships')
        .insert({
          student_id: data.student_id,
          scholarship_id: data.scholarship_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['bursar-metrics'] });
      setIsAwardScholarshipOpen(false);
      awardForm.reset();
      toast.success('Scholarship awarded successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to award scholarship');
      console.error('Error awarding scholarship:', error);
    }
  });

  const deleteScholarshipMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scholarships')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      toast.success('Scholarship deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete scholarship');
    }
  });

  const toggleScholarshipStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('scholarships')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update scholarship status');
    } else {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      toast.success(`Scholarship ${!currentStatus ? 'activated' : 'deactivated'}`);
    }
  };

  const onCreateScholarship = (data: any) => {
    createScholarshipMutation.mutate(data);
  };

  const onAwardScholarship = (data: any) => {
    awardScholarshipMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalScholarshipValue = studentScholarships
    .filter((s: any) => s.status === 'active')
    .reduce((sum, s: any) => sum + Number(s.amount || 0), 0);

  const activeScholarships = scholarships.filter((s: any) => s.is_active);
  const totalRecipients = studentScholarships.filter((s: any) => s.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Scholarship Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage scholarships and awards
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateScholarshipOpen} onOpenChange={setIsCreateScholarshipOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Award className="h-4 w-4 mr-2" />
                Create Scholarship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Scholarship</DialogTitle>
              </DialogHeader>
              <Form {...scholarshipForm}>
                <form onSubmit={scholarshipForm.handleSubmit(onCreateScholarship)} className="space-y-4">
                  <FormField
                    control={scholarshipForm.control}
                    name="name"
                    rules={{ required: 'Scholarship name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scholarship Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Merit Scholarship" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scholarshipForm.control}
                    name="type"
                    rules={{ required: 'Scholarship type is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Based</SelectItem>
                            <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scholarshipForm.control}
                    name="value"
                    rules={{ required: 'Value is required', min: { value: 0.01, message: 'Value must be positive' } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scholarship Value ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scholarshipForm.control}
                    name="max_recipients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Recipients (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Leave empty for unlimited" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scholarshipForm.control}
                    name="criteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eligibility Criteria (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the eligibility criteria..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scholarshipForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Scholarship description..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateScholarshipOpen(false);
                        scholarshipForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createScholarshipMutation.isPending}>
                      {createScholarshipMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAwardScholarshipOpen} onOpenChange={setIsAwardScholarshipOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Award Scholarship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Award Scholarship</DialogTitle>
              </DialogHeader>
              <Form {...awardForm}>
                <form onSubmit={awardForm.handleSubmit(onAwardScholarship)} className="space-y-4">
                  <FormField
                    control={awardForm.control}
                    name="student_id"
                    rules={{ required: 'Please select a student' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.length === 0 ? (
                              <SelectItem value="none" disabled>No students found</SelectItem>
                            ) : (
                              students.map((student: any) => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.student_id} - {student.studentName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={awardForm.control}
                    name="scholarship_id"
                    rules={{ required: 'Please select a scholarship' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scholarship</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select scholarship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeScholarships.length === 0 ? (
                              <SelectItem value="none" disabled>No active scholarships</SelectItem>
                            ) : (
                              activeScholarships.map((scholarship: any) => (
                                <SelectItem key={scholarship.id} value={scholarship.id}>
                                  {scholarship.name} - {formatCurrency(Number(scholarship.value))}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={awardForm.control}
                    name="amount"
                    rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Amount must be positive' } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Award Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={awardForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Award notes..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAwardScholarshipOpen(false);
                        awardForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={awardScholarshipMutation.isPending}>
                      {awardScholarshipMutation.isPending ? 'Awarding...' : 'Award'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Scholarships</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeScholarships.length}</div>
            <p className="text-xs text-muted-foreground">Available programs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecipients}</div>
            <p className="text-xs text-muted-foreground">Students awarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalScholarshipValue)}</div>
            <p className="text-xs text-muted-foreground">Awarded amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scholarships..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scholarships" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
        </TabsList>

        <TabsContent value="scholarships">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Scholarship Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingScholarships ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : scholarships.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No scholarships found. Click "Create Scholarship" to add one.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Max Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scholarships.map((scholarship: any) => (
                      <TableRow key={scholarship.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{scholarship.name}</div>
                            {scholarship.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {scholarship.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{scholarship.type?.replace('_', ' ')}</TableCell>
                        <TableCell>{formatCurrency(Number(scholarship.value))}</TableCell>
                        <TableCell>{scholarship.max_recipients || 'Unlimited'}</TableCell>
                        <TableCell>
                          <Badge variant={scholarship.is_active ? 'default' : 'secondary'}>
                            {scholarship.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleScholarshipStatus(scholarship.id, scholarship.is_active)}
                            >
                              {scholarship.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this scholarship?')) {
                                  deleteScholarshipMutation.mutate(scholarship.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="awards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Scholarship Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStudentScholarships ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : studentScholarships.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No awards found. Click "Award Scholarship" to assign one to a student.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Scholarship</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Awarded Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentScholarships.map((award: any) => (
                      <TableRow key={award.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{award.studentName}</div>
                            <div className="text-sm text-muted-foreground">{award.studentIdNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{award.scholarshipName}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {award.scholarshipType?.replace('_', ' ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(award.amount))}</TableCell>
                        <TableCell>
                          {award.awarded_date 
                            ? new Date(award.awarded_date).toLocaleDateString() 
                            : new Date(award.created_at).toLocaleDateString()
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={award.status === 'active' ? 'default' : 'secondary'}>
                            {award.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Scholarships;
