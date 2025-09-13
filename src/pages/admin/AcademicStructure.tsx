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
  ChevronRight,
  Folder,
  FolderOpen,
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

interface Level {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  children?: Level[];
  classes?: Class[];
}

interface Class {
  id: string;
  name: string;
  level_id: string | null;
  max_students: number;
  academic_year_id: string | null;
  class_teacher_id: string | null;
  created_at: string;
  academic_year?: {
    name: string;
  };
  level?: {
    name: string;
  };
  streams?: Stream[];
}

interface Stream {
  id: string;
  name: string;
  class_id: string;
  max_students: number;
  stream_teacher_id: string | null;
  created_at: string;
  class?: {
    name: string;
    level?: {
      name: string;
    };
  };
}

const AcademicStructure = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('years');
  const [isYearDialogOpen, setIsYearDialogOpen] = useState(false);
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [isStreamDialogOpen, setIsStreamDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  
  const [yearForm, setYearForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });

  const [levelForm, setLevelForm] = useState({
    name: '',
    parent_id: '',
  });
  
  const [classForm, setClassForm] = useState({
    name: '',
    level_id: '',
    max_students: '40',
    academic_year_id: '',
  });
  
  const [streamForm, setStreamForm] = useState({
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

      // Fetch levels
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .order('name');

      if (levelsError) throw levelsError;

      // Fetch classes with levels and academic years
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          level:levels(name),
          academic_year:academic_years(name)
        `)
        .order('name');

      if (classesError) throw classesError;

      // Fetch streams with class and level info
      const { data: streamsData, error: streamsError } = await supabase
        .from('streams')
        .select(`
          *,
          class:classes(
            name,
            level:levels(name)
          )
        `)
        .order('name');

      if (streamsError) throw streamsError;

      setAcademicYears(yearsData || []);
      setLevels(buildLevelHierarchy(levelsData || []));
      setClasses(classesData || []);
      setStreams(streamsData || []);
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

  const buildLevelHierarchy = (levelsData: Level[]): Level[] => {
    const levelMap = new Map<string, Level>();
    const rootLevels: Level[] = [];

    // Initialize all levels with empty children array
    levelsData.forEach(level => {
      levelMap.set(level.id, { ...level, children: [] });
    });

    // Build the hierarchy
    levelsData.forEach(level => {
      const levelWithChildren = levelMap.get(level.id)!;
      if (level.parent_id) {
        const parent = levelMap.get(level.parent_id);
        if (parent) {
          parent.children!.push(levelWithChildren);
        }
      } else {
        rootLevels.push(levelWithChildren);
      }
    });

    return rootLevels;
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

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!levelForm.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const levelData = {
        ...levelForm,
        parent_id: levelForm.parent_id === 'none' ? null : levelForm.parent_id || null,
      };

      if (selectedLevel) {
        const { error } = await supabase
          .from('levels')
          .update(levelData)
          .eq('id', selectedLevel.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Level updated successfully' });
      } else {
        const { error } = await supabase
          .from('levels')
          .insert([levelData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Level created successfully' });
      }

      setIsLevelDialogOpen(false);
      resetLevelForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving level:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save level',
        variant: 'destructive',
      });
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classForm.name) {
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
        max_students: parseInt(classForm.max_students),
        level_id: classForm.level_id === 'none' ? null : classForm.level_id || null,
        academic_year_id: classForm.academic_year_id === 'none' ? null : classForm.academic_year_id || null,
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

  const handleSaveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!streamForm.name || !streamForm.class_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const streamData = {
        ...streamForm,
        max_students: parseInt(streamForm.max_students),
      };

      if (selectedStream) {
        const { error } = await supabase
          .from('streams')
          .update(streamData)
          .eq('id', selectedStream.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Stream updated successfully' });
      } else {
        const { error } = await supabase
          .from('streams')
          .insert([streamData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Stream created successfully' });
      }

      setIsStreamDialogOpen(false);
      resetStreamForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving stream:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save stream',
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

  const resetLevelForm = () => {
    setLevelForm({ name: '', parent_id: '' });
    setSelectedLevel(null);
  };

  const resetClassForm = () => {
    setClassForm({ name: '', level_id: '', max_students: '40', academic_year_id: '' });
    setSelectedClass(null);
  };

  const resetStreamForm = () => {
    setStreamForm({ name: '', class_id: '', max_students: '30' });
    setSelectedStream(null);
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

  const openEditLevel = (level: Level) => {
    setSelectedLevel(level);
    setLevelForm({
      name: level.name,
      parent_id: level.parent_id || 'none',
    });
    setIsLevelDialogOpen(true);
  };

  const openEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setClassForm({
      name: cls.name,
      level_id: cls.level_id || 'none',
      max_students: cls.max_students.toString(),
      academic_year_id: cls.academic_year_id || 'none',
    });
    setIsClassDialogOpen(true);
  };

  const openEditStream = (stream: Stream) => {
    setSelectedStream(stream);
    setStreamForm({
      name: stream.name,
      class_id: stream.class_id,
      max_students: stream.max_students.toString(),
    });
    setIsStreamDialogOpen(true);
  };

  const getAllLevels = (levelArray: Level[]): Level[] => {
    const allLevels: Level[] = [];
    const traverse = (levels: Level[]) => {
      levels.forEach(level => {
        allLevels.push(level);
        if (level.children) {
          traverse(level.children);
        }
      });
    };
    traverse(levelArray);
    return allLevels;
  };

  const renderLevelHierarchy = (levels: Level[], depth = 0) => {
    return levels.map(level => {
      const levelClasses = classes.filter(cls => cls.level_id === level.id);
      
      return (
        <div key={level.id} className="border rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div style={{ marginLeft: `${depth * 20}px` }} className="flex items-center">
                {level.children && level.children.length > 0 ? (
                  <FolderOpen className="h-4 w-4 mr-2 text-primary" />
                ) : (
                  <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                )}
                <span className="font-medium">{level.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {levelClasses.length} classes
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditLevel(level)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          
          {levelClasses.length > 0 && (
            <div className="ml-6 space-y-2">
              {levelClasses.map(cls => {
                const classStreams = streams.filter(s => s.class_id === cls.id);
                return (
                  <div key={cls.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      <span>{cls.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {classStreams.length} streams
                      </Badge>
                      {classStreams.map(stream => (
                        <Badge key={stream.id} variant="secondary" className="ml-1">
                          {stream.name}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditClass(cls)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          
          {level.children && level.children.length > 0 && (
            <div className="ml-4 mt-2">
              {renderLevelHierarchy(level.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
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
            Manage academic years, levels, classes, and streams
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium">Levels</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAllLevels(levels).length}</div>
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
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {streams.reduce((sum, stream) => sum + stream.max_students, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Student capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="streams">Streams</TabsTrigger>
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
                          {selectedYear ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicYears.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">{year.name}</TableCell>
                      <TableCell>
                        {format(new Date(year.start_date), 'MMM dd, yyyy')} -{' '}
                        {format(new Date(year.end_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {year.is_current ? (
                          <Badge variant="default">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Current
                          </Badge>
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
                      <TableCell>
                        <div className="flex gap-2">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Academic Hierarchy</CardTitle>
                  <CardDescription>View the complete academic structure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {renderLevelHierarchy(levels)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Academic Levels</CardTitle>
                  <CardDescription>Manage educational levels with hierarchy support</CardDescription>
                </div>
                <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetLevelForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Level
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedLevel ? 'Edit Level' : 'Add Level'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveLevel} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="level-name">Level Name *</Label>
                        <Input
                          id="level-name"
                          placeholder="e.g., Nursery, Primary, Secondary"
                          value={levelForm.name}
                          onChange={(e) => setLevelForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent-level">Parent Level</Label>
                        <Select
                          value={levelForm.parent_id}
                          onValueChange={(value) => setLevelForm(prev => ({ ...prev, parent_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent level (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Root Level)</SelectItem>
                            {getAllLevels(levels).map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsLevelDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {selectedLevel ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent Level</TableHead>
                    <TableHead>Classes Count</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAllLevels(levels).map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>
                        {level.parent_id ? (
                          getAllLevels(levels).find(l => l.id === level.parent_id)?.name || 'Unknown'
                        ) : (
                          <Badge variant="outline">Root Level</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {classes.filter(cls => cls.level_id === level.id).length}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditLevel(level)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>Manage class groups within levels</CardDescription>
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
                      <div className="space-y-2">
                        <Label htmlFor="class-name">Class Name *</Label>
                        <Input
                          id="class-name"
                          placeholder="e.g., P1, S1, Form 1"
                          value={classForm.name}
                          onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="level">Level</Label>
                        <Select
                          value={classForm.level_id}
                          onValueChange={(value) => setClassForm(prev => ({ ...prev, level_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Level</SelectItem>
                            {getAllLevels(levels).map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-students">Max Students</Label>
                        <Input
                          id="max-students"
                          type="number"
                          min="1"
                          value={classForm.max_students}
                          onChange={(e) => setClassForm(prev => ({ ...prev, max_students: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="academic-year">Academic Year</Label>
                        <Select
                          value={classForm.academic_year_id}
                          onValueChange={(value) => setClassForm(prev => ({ ...prev, academic_year_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Academic Year</SelectItem>
                            {academicYears.map((year) => (
                              <SelectItem key={year.id} value={year.id}>
                                {year.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          {selectedClass ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Max Students</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Streams</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>
                        {cls.level?.name || <Badge variant="outline">No Level</Badge>}
                      </TableCell>
                      <TableCell>{cls.max_students}</TableCell>
                      <TableCell>
                        {cls.academic_year?.name || <Badge variant="outline">No Year</Badge>}
                      </TableCell>
                      <TableCell>
                        {streams.filter(s => s.class_id === cls.id).length}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Streams</CardTitle>
                  <CardDescription>Manage streams within classes</CardDescription>
                </div>
                <Dialog open={isStreamDialogOpen} onOpenChange={setIsStreamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetStreamForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Stream
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedStream ? 'Edit Stream' : 'Add Stream'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveStream} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="stream-name">Stream Name *</Label>
                        <Input
                          id="stream-name"
                          placeholder="e.g., A, B, C, Blue, Red"
                          value={streamForm.name}
                          onChange={(e) => setStreamForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="class">Class *</Label>
                        <Select
                          value={streamForm.class_id}
                          onValueChange={(value) => setStreamForm(prev => ({ ...prev, class_id: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} {cls.level?.name && `(${cls.level.name})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stream-max-students">Max Students</Label>
                        <Input
                          id="stream-max-students"
                          type="number"
                          min="1"
                          value={streamForm.max_students}
                          onChange={(e) => setStreamForm(prev => ({ ...prev, max_students: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsStreamDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {selectedStream ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Max Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream) => (
                    <TableRow key={stream.id}>
                      <TableCell className="font-medium">{stream.name}</TableCell>
                      <TableCell>{stream.class?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {stream.class?.level?.name || <Badge variant="outline">No Level</Badge>}
                      </TableCell>
                      <TableCell>{stream.max_students}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditStream(stream)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicStructure;