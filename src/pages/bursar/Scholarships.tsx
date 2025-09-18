import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { GraduationCap, Plus, Search, Award, Users } from 'lucide-react';

interface Scholarship {
  id: string;
  name: string;
  description?: string;
  type: string;
  value: number;
  criteria?: string;
  max_recipients?: number;
  is_active: boolean;
}

interface StudentScholarship {
  id: string;
  amount: number;
  awarded_date: string;
  status: string;
  students: {
    student_id: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
  scholarships: {
    name: string;
    type: string;
  };
}

const Scholarships = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isCreateScholarshipOpen, setIsCreateScholarshipOpen] = useState(false);
  const [isAwardScholarshipOpen, setIsAwardScholarshipOpen] = useState(false);
  const queryClient = useQueryClient();
  const scholarshipForm = useForm();
  const awardForm = useForm();

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
      return data;
    }
  });

  const { data: studentScholarships = [], isLoading: isLoadingStudentScholarships } = useQuery({
    queryKey: ['student-scholarships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_scholarships')
        .select(`
          *,
          students!inner(
            student_id,
            profiles!inner(first_name, last_name)
          ),
          scholarships!inner(name, type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-scholarships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          profiles!inner(first_name, last_name)
        `)
        .eq('enrollment_status', 'active');
      
      if (error) throw error;
      return data;
    }
  });

  const createScholarshipMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('scholarships')
        .insert({
          name: data.name,
          description: data.description,
          type: data.type,
          value: parseFloat(data.value),
          criteria: data.criteria,
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
    onError: (error) => {
      toast.error('Failed to create scholarship');
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
          notes: data.notes
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-scholarships'] });
      setIsAwardScholarshipOpen(false);
      awardForm.reset();
      toast.success('Scholarship awarded successfully');
    },
    onError: (error) => {
      toast.error('Failed to award scholarship');
      console.error('Error awarding scholarship:', error);
    }
  });

  const onCreateScholarship = (data: any) => {
    createScholarshipMutation.mutate(data);
  };

  const onAwardScholarship = (data: any) => {
    awardScholarshipMutation.mutate(data);
  };

  const totalScholarshipValue = studentScholarships
    .filter((s: StudentScholarship) => s.status === 'active')
    .reduce((sum, s) => sum + (parseFloat(s.amount.toString()) || 0), 0);

  const activeScholarships = scholarships.filter((s: Scholarship) => s.is_active);
  const totalRecipients = studentScholarships.filter((s: StudentScholarship) => s.status === 'active').length;

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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scholarshipForm.control}
                    name="max_recipients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Recipients</FormLabel>
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
                        <FormLabel>Eligibility Criteria</FormLabel>
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
                        <FormLabel>Description</FormLabel>
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
                      onClick={() => setIsCreateScholarshipOpen(false)}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map((student: any) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.student_id} - {student.profiles.first_name} {student.profiles.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select scholarship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeScholarships.map((scholarship: Scholarship) => (
                              <SelectItem key={scholarship.id} value={scholarship.id}>
                                {scholarship.name} - ${scholarship.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={awardForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
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
                      onClick={() => setIsAwardScholarshipOpen(false)}
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
            <div className="text-2xl font-bold">${totalScholarshipValue.toFixed(2)}</div>
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
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="need_based">Need Based</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="arts">Arts</SelectItem>
                <SelectItem value="community_service">Community Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scholarships" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scholarships">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Available Scholarships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingScholarships ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
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
                    {scholarships.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No scholarships found
                        </TableCell>
                      </TableRow>
                    ) : (
                      scholarships.map((scholarship: Scholarship) => (
                        <TableRow key={scholarship.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{scholarship.name}</div>
                              {scholarship.description && (
                                <div className="text-sm text-muted-foreground">
                                  {scholarship.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{scholarship.type.replace('_', ' ')}</TableCell>
                          <TableCell>${parseFloat(scholarship.value.toString()).toFixed(2)}</TableCell>
                          <TableCell>{scholarship.max_recipients || 'Unlimited'}</TableCell>
                          <TableCell>
                            <Badge variant={scholarship.is_active ? 'default' : 'secondary'}>
                              {scholarship.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
                <Users className="h-5 w-5" />
                Scholarship Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStudentScholarships ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Scholarship</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Awarded Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentScholarships.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No awards found
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentScholarships.map((award: StudentScholarship) => (
                        <TableRow key={award.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {award.students.profiles.first_name} {award.students.profiles.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {award.students.student_id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{award.scholarships.name}</TableCell>
                          <TableCell className="capitalize">{award.scholarships.type.replace('_', ' ')}</TableCell>
                          <TableCell>${parseFloat(award.amount.toString()).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={award.status === 'active' ? 'default' : 'secondary'}>
                              {award.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(award.awarded_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
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