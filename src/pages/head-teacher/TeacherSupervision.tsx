import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Search, 
  BookOpen, 
  BarChart3, 
  FileText,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Mail,
  Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Teacher {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  qualification: string;
  specialization: string;
  classesCount: number;
  studentsCount: number;
  subjectsCount: number;
  attendanceRate: number;
  pendingSubmissions: number;
}

const TeacherSupervision = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);

      // Fetch all teachers from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('role', 'teacher')
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setTeachers([]);
        return;
      }

      const profileIds = profiles.map(p => p.id);

      // Fetch teacher details
      const { data: teacherDetails } = await supabase
        .from('teachers')
        .select('profile_id, department, qualification, specialization')
        .in('profile_id', profileIds);

      // Fetch teacher specializations (subjects/classes assigned)
      const { data: specializations } = await supabase
        .from('teacher_specializations')
        .select('teacher_id, subject_id, class_id')
        .in('teacher_id', profileIds);

      // Fetch pending submissions count per teacher
      const { data: submissions } = await supabase
        .from('subject_submissions')
        .select('submitted_by')
        .eq('status', 'pending')
        .in('submitted_by', profileIds);

      // Fetch teacher attendance for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: attendance } = await supabase
        .from('teacher_attendance')
        .select('teacher_id, status')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .in('teacher_id', profileIds);

      // Get unique class IDs for student counting
      const classIds = [...new Set(specializations?.map(s => s.class_id).filter(Boolean) || [])];
      
      // Fetch student counts per class
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('class_id, student_id')
        .in('class_id', classIds)
        .eq('status', 'active');

      // Build maps
      const teacherDetailsMap = new Map(teacherDetails?.map(t => [t.profile_id, t]) || []);
      const specializationsByTeacher = new Map<string, typeof specializations>();
      specializations?.forEach(s => {
        if (!specializationsByTeacher.has(s.teacher_id)) {
          specializationsByTeacher.set(s.teacher_id, []);
        }
        specializationsByTeacher.get(s.teacher_id)!.push(s);
      });

      const submissionsByTeacher = new Map<string, number>();
      submissions?.forEach(s => {
        submissionsByTeacher.set(s.submitted_by, (submissionsByTeacher.get(s.submitted_by) || 0) + 1);
      });

      const attendanceByTeacher = new Map<string, { total: number; present: number }>();
      attendance?.forEach(a => {
        if (!attendanceByTeacher.has(a.teacher_id)) {
          attendanceByTeacher.set(a.teacher_id, { total: 0, present: 0 });
        }
        const record = attendanceByTeacher.get(a.teacher_id)!;
        record.total++;
        if (a.status === 'present' || a.status === 'late') {
          record.present++;
        }
      });

      const studentsByClass = new Map<string, number>();
      enrollments?.forEach(e => {
        studentsByClass.set(e.class_id, (studentsByClass.get(e.class_id) || 0) + 1);
      });

      // Build teacher list
      const teacherList: Teacher[] = profiles.map(profile => {
        const details = teacherDetailsMap.get(profile.id);
        const specs = specializationsByTeacher.get(profile.id) || [];
        const uniqueClasses = new Set(specs.map(s => s.class_id).filter(Boolean));
        const uniqueSubjects = new Set(specs.map(s => s.subject_id).filter(Boolean));
        
        let totalStudents = 0;
        uniqueClasses.forEach(classId => {
          totalStudents += studentsByClass.get(classId!) || 0;
        });

        const attendanceRecord = attendanceByTeacher.get(profile.id);
        const attendanceRate = attendanceRecord 
          ? Math.round((attendanceRecord.present / attendanceRecord.total) * 100) 
          : 100;

        return {
          id: profile.id,
          profile_id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          phone: profile.phone || 'N/A',
          department: details?.department || 'General',
          qualification: details?.qualification || 'N/A',
          specialization: details?.specialization || 'N/A',
          classesCount: uniqueClasses.size,
          studentsCount: totalStudents,
          subjectsCount: uniqueSubjects.size,
          attendanceRate,
          pendingSubmissions: submissionsByTeacher.get(profile.id) || 0,
        };
      });

      setTeachers(teacherList);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
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
        <h1 className="text-3xl font-bold tracking-tight">Teacher Supervision</h1>
        <p className="text-muted-foreground">
          Monitor teacher performance and academic supervision
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(teachers.flatMap(t => t.classesCount)).size > 0 
                ? teachers.reduce((sum, t) => sum + t.classesCount, 0)
                : 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.reduce((sum, t) => sum + t.pendingSubmissions, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.length > 0 
                ? Math.round(teachers.reduce((sum, t) => sum + t.attendanceRate, 0) / teachers.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search teachers by name, department, or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teachers List */}
        <div className="lg:col-span-2">
          {filteredTeachers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchTerm ? 'No teachers found matching your search.' : 'No teachers found in the system.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTeachers.map((teacher) => (
                <Card key={teacher.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {teacher.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg">{teacher.name}</h3>
                            <p className="text-sm text-muted-foreground">{teacher.department}</p>
                            <p className="text-xs text-muted-foreground">
                              {teacher.classesCount} classes • {teacher.studentsCount} students • {teacher.subjectsCount} subjects
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <span className={getAttendanceColor(teacher.attendanceRate)}>
                                {teacher.attendanceRate}% attendance
                              </span>
                            </div>
                            {teacher.pendingSubmissions > 0 && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-600">
                                  {teacher.pendingSubmissions} pending
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <Badge variant="outline">
                          {teacher.qualification}
                        </Badge>
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTeacher(teacher)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Teacher Details Panel */}
        <div>
          {selectedTeacher ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Teacher Details</span>
                </CardTitle>
                <CardDescription>Detailed supervision information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {selectedTeacher.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-lg">{selectedTeacher.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedTeacher.department}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">{selectedTeacher.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTeacher.phone}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3">Academic Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Qualification:</span>
                      <span>{selectedTeacher.qualification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Specialization:</span>
                      <span>{selectedTeacher.specialization}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Classes:</span>
                      <span>{selectedTeacher.classesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subjects:</span>
                      <span>{selectedTeacher.subjectsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Students:</span>
                      <span>{selectedTeacher.studentsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3">Performance</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Attendance Rate</span>
                      <span className={`text-sm font-medium ${getAttendanceColor(selectedTeacher.attendanceRate)}`}>
                        {selectedTeacher.attendanceRate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending Submissions</span>
                      <Badge variant={selectedTeacher.pendingSubmissions > 0 ? 'destructive' : 'secondary'}>
                        {selectedTeacher.pendingSubmissions}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSelectedTeacher(null)}
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a teacher to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSupervision;
