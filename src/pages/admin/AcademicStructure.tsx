import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Building,
  Calendar,
  Users,
  Edit,
  Trash2,
  GraduationCap,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

interface Class {
  id: string;
  name: string;
  level: number;
  max_students: number;
  academic_year_id: string | null;
  class_teacher_id: string | null;
  created_at: string;
  academic_year?: {
    name: string;
  };
  sections?: Section[];
}

interface Section {
  id: string;
  name: string;
  class_id: string;
  max_students: number;
  section_teacher_id: string | null;
  created_at: string;
}

const AcademicStructure = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('years');
  const [isYearDialogOpen, setIsYearDialogOpen] = useState(false);
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  const [yearForm, setYearForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });
  
  const [classForm, setClassForm] = useState({
    name: '',
    level: '',
    max_students: '40',
    academic_year_id: '',
  });
  
  const [sectionForm, setSectionForm] = useState({
    name: '',
    class_id: '',
    max_students: '30',
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch academic years
      const { data: yearsData, error: yearsError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (yearsError) throw yearsError;

      // Fetch classes with academic years
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          academic_year:academic_years(name)
        `)
        .order('level', { ascending: true });

      if (classesError) throw classesError;

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('name', { ascending: true });

      if (sectionsError) throw sectionsError;

      setAcademicYears(yearsData || []);
      setClasses(classesData || []);
      setSections(sectionsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!yearForm.name || !yearForm.start_date || !yearForm.end_date) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (selectedYear) {
        const { error } = await supabase
          .from('academic_years')
          .update(yearForm)
          .eq('id', selectedYear.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Academic year updated successfully' });
      } else {
        const { error } = await supabase
          .from('academic_years')
          .insert([yearForm]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Academic year created successfully' });
      }

      setIsYearDialogOpen(false);
      resetYearForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving year:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save academic year',
        variant: 'destructive',
      });
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classForm.name || !classForm.level) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const classData = {
        ...classForm,
        level: parseInt(classForm.level),
        max_students: parseInt(classForm.max_students),
        academic_year_id: classForm.academic_year_id || null,
      };

      if (selectedClass) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', selectedClass.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Class updated successfully' });
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([classData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Class created successfully' });
      }

      setIsClassDialogOpen(false);
      resetClassForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving class:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save class',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sectionForm.name || !sectionForm.class_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const sectionData = {
        ...sectionForm,
        max_students: parseInt(sectionForm.max_students),
      };

      if (selectedSection) {
        const { error } = await supabase
          .from('sections')
          .update(sectionData)
          .eq('id', selectedSection.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Section updated successfully' });
      } else {
        const { error } = await supabase
          .from('sections')
          .insert([sectionData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Section created successfully' });
      }

      setIsSectionDialogOpen(false);
      resetSectionForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save section',
        variant: 'destructive',
      });
    }
  };

  const handleSetCurrentYear = async (yearId: string) => {
    try {
      // First, set all years to non-current
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .neq('id', '');

      // Then set the selected year as current
      const { error } = await supabase
        .from('academic_years')
        .update({ is_current: true })
        .eq('id', yearId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Current academic year updated successfully',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error setting current year:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update current year',
        variant: 'destructive',
      });
    }
  };

  const resetYearForm = () => {
    setYearForm({ name: '', start_date: '', end_date: '' });
    setSelectedYear(null);
  };

  const resetClassForm = () => {
    setClassForm({ name: '', level: '', max_students: '40', academic_year_id: '' });
    setSelectedClass(null);
  };

  const resetSectionForm = () => {
    setSectionForm({ name: '', class_id: '', max_students: '30' });
    setSelectedSection(null);
  };

  const openEditYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setYearForm({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setIsYearDialogOpen(true);
  };

  const openEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setClassForm({
      name: cls.name,
      level: cls.level.toString(),
      max_students: cls.max_students.toString(),
      academic_year_id: cls.academic_year_id || '',
    });
    setIsClassDialogOpen(true);
  };

  const openEditSection = (section: Section) => {
    setSelectedSection(section);
    setSectionForm({
      name: section.name,
      class_id: section.class_id,
      max_students: section.max_students.toString(),
    });
    setIsSectionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading academic structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Academic Structure</h1>
          <p className="text-muted-foreground">
            Manage academic years, classes, and sections
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Academic Years</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{academicYears.length}</div>
            <p className="text-xs text-muted-foreground">
              {academicYears.filter(y => y.is_current).length} current
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.reduce((sum, section) => sum + section.max_students, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Student capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="years" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Academic Years</CardTitle>
                  <CardDescription>Manage academic year periods</CardDescription>
                </div>
                <Dialog open={isYearDialogOpen} onOpenChange={setIsYearDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetYearForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Academic Year
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedYear ? 'Edit Academic Year' : 'Add Academic Year'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveYear} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="year-name">Name *</Label>
                        <Input
                          id="year-name"
                          placeholder="e.g., 2024-2025"
                          value={yearForm.name}
                          onChange={(e) => setYearForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date *</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={yearForm.start_date}
                            onChange={(e) => setYearForm(prev => ({ ...prev, start_date: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">End Date *</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={yearForm.end_date}
                            onChange={(e) => setYearForm(prev => ({ ...prev, end_date: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsYearDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {selectedYear ? 'Update' : 'Create'} Academic Year
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {academicYears.map((year) => (
                      <TableRow key={year.id}>
                        <TableCell className="font-medium">{year.name}</TableCell>
                        <TableCell>
                          {format(new Date(year.start_date), 'MMM dd, yyyy')} - {' '}
                          {format(new Date(year.end_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {year.is_current ? (
                            <Badge className="bg-accent text-accent-foreground">Current</Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetCurrentYear(year.id)}
                            >
                              Set as Current
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditYear(year)}
                            >
                              <Edit className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>Manage class levels and configurations</CardDescription>
                </div>
                <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetClassForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedClass ? 'Edit Class' : 'Add Class'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveClass} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="class-name">Class Name *</Label>
                          <Input
                            id="class-name"
                            placeholder="e.g., Grade 1A"
                            value={classForm.name}
                            onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="class-level">Level *</Label>
                          <Input
                            id="class-level"
                            type="number"
                            min="1"
                            max="12"
                            placeholder="1-12"
                            value={classForm.level}
                            onChange={(e) => setClassForm(prev => ({ ...prev, level: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="class-max-students">Max Students</Label>
                          <Input
                            id="class-max-students"
                            type="number"
                            min="1"
                            value={classForm.max_students}
                            onChange={(e) => setClassForm(prev => ({ ...prev, max_students: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="class-academic-year">Academic Year</Label>
                          <Select
                            value={classForm.academic_year_id}
                            onValueChange={(value) => setClassForm(prev => ({ ...prev, academic_year_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select academic year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No specific year</SelectItem>
                              {academicYears.map((year) => (
                                <SelectItem key={year.id} value={year.id}>
                                  {year.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsClassDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {selectedClass ? 'Update' : 'Create'} Class
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Max Students</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((cls) => {
                      const classSections = sections.filter(s => s.class_id === cls.id);
                      return (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell>Level {cls.level}</TableCell>
                          <TableCell>{cls.max_students}</TableCell>
                          <TableCell>
                            {cls.academic_year?.name || 'Not assigned'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {classSections.length} sections
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditClass(cls)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sections</CardTitle>
                  <CardDescription>Manage class sections and divisions</CardDescription>
                </div>
                <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetSectionForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Section
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedSection ? 'Edit Section' : 'Add Section'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveSection} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="section-name">Section Name *</Label>
                          <Input
                            id="section-name"
                            placeholder="e.g., A, B, Alpha"
                            value={sectionForm.name}
                            onChange={(e) => setSectionForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="section-max-students">Max Students</Label>
                          <Input
                            id="section-max-students"
                            type="number"
                            min="1"
                            value={sectionForm.max_students}
                            onChange={(e) => setSectionForm(prev => ({ ...prev, max_students: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="section-class">Class *</Label>
                        <Select
                          value={sectionForm.class_id}
                          onValueChange={(value) => setSectionForm(prev => ({ ...prev, class_id: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} (Level {cls.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsSectionDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {selectedSection ? 'Update' : 'Create'} Section
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Max Students</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.map((section) => {
                      const cls = classes.find(c => c.id === section.class_id);
                      return (
                        <TableRow key={section.id}>
                          <TableCell className="font-medium">{section.name}</TableCell>
                          <TableCell>
                            {cls ? `${cls.name} (Level ${cls.level})` : 'Unknown Class'}
                          </TableCell>
                          <TableCell>{section.max_students}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSection(section)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicStructure;