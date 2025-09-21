import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  BookOpen, 
  Calendar, 
  BarChart3, 
  FileText,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
  classesCount: number;
  studentsCount: number;
  lessonPlansStatus: 'up-to-date' | 'pending' | 'overdue';
  attendanceRate: number;
  gradingStatus: 'complete' | 'pending' | 'overdue';
  performanceScore: number;
}

const TeacherSupervision = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [lessonPlansOpen, setLessonPlansOpen] = useState(false);
  const [gradeReportsOpen, setGradeReportsOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);

  const teachers: Teacher[] = [
    {
      id: '1',
      name: 'John Johnson',
      subject: 'Mathematics',
      email: 'j.johnson@school.edu',
      phone: '+1234567890',
      classesCount: 5,
      studentsCount: 125,
      lessonPlansStatus: 'up-to-date',
      attendanceRate: 95.5,
      gradingStatus: 'complete',
      performanceScore: 4.8,
    },
    {
      id: '2',
      name: 'Sarah Smith',
      subject: 'English Literature',
      email: 's.smith@school.edu',
      phone: '+1234567891',
      classesCount: 4,
      studentsCount: 98,
      lessonPlansStatus: 'pending',
      attendanceRate: 92.3,
      gradingStatus: 'pending',
      performanceScore: 4.6,
    },
    {
      id: '3',
      name: 'Michael Brown',
      subject: 'Physics',
      email: 'm.brown@school.edu',
      phone: '+1234567892',
      classesCount: 3,
      studentsCount: 78,
      lessonPlansStatus: 'overdue',
      attendanceRate: 88.9,
      gradingStatus: 'overdue',
      performanceScore: 4.2,
    },
    {
      id: '4',
      name: 'Emily Davis',
      subject: 'Chemistry',
      email: 'e.davis@school.edu',
      phone: '+1234567893',
      classesCount: 4,
      studentsCount: 102,
      lessonPlansStatus: 'up-to-date',
      attendanceRate: 97.1,
      gradingStatus: 'complete',
      performanceScore: 4.9,
    },
    {
      id: '5',
      name: 'David Wilson',
      subject: 'History',
      email: 'd.wilson@school.edu',
      phone: '+1234567894',
      classesCount: 6,
      studentsCount: 145,
      lessonPlansStatus: 'pending',
      attendanceRate: 94.2,
      gradingStatus: 'pending',
      performanceScore: 4.5,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up-to-date':
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up-to-date':
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teacher Supervision</h1>
        <p className="text-muted-foreground">
          Monitor teacher performance, lesson plans, and academic supervision
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
            <CardTitle className="text-sm font-medium">Lesson Plans Up-to-Date</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.lessonPlansStatus === 'up-to-date').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.lessonPlansStatus === 'pending' || t.gradingStatus === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.lessonPlansStatus === 'overdue' || t.gradingStatus === 'overdue').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search teachers by name or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teachers List */}
        <div className="lg:col-span-2">
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
                          <p className="text-sm text-muted-foreground">{teacher.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {teacher.classesCount} classes • {teacher.studentsCount} students
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(teacher.lessonPlansStatus)}
                            <span>Lesson Plans</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(teacher.gradingStatus)}
                            <span>Grading</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className={getPerformanceColor(teacher.performanceScore)}>
                              {teacher.performanceScore}/5.0
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <Badge variant="outline">
                        {teacher.attendanceRate}% Attendance
                      </Badge>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeacher(teacher)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                <div>
                  <h4 className="font-medium mb-2">{selectedTeacher.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject:</span>
                      <span>{selectedTeacher.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="text-xs">{selectedTeacher.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Classes:</span>
                      <span>{selectedTeacher.classesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Students:</span>
                      <span>{selectedTeacher.studentsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3">Status Overview</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lesson Plans</span>
                      <Badge className={`text-xs ${getStatusColor(selectedTeacher.lessonPlansStatus)}`}>
                        {selectedTeacher.lessonPlansStatus.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grading Status</span>
                      <Badge className={`text-xs ${getStatusColor(selectedTeacher.gradingStatus)}`}>
                        {selectedTeacher.gradingStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Attendance Rate</span>
                      <span className="text-sm font-medium">{selectedTeacher.attendanceRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Performance Score</span>
                      <span className={`text-sm font-medium ${getPerformanceColor(selectedTeacher.performanceScore)}`}>
                        {selectedTeacher.performanceScore}/5.0
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Dialog open={lessonPlansOpen} onOpenChange={setLessonPlansOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="sm">
                        Review Lesson Plans
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Lesson Plans Review - {selectedTeacher.name}</DialogTitle>
                        <DialogDescription>
                          Review and approve lesson plans for {selectedTeacher.subject}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Week 1-2: Introduction & Fundamentals</CardTitle>
                              <Badge className={getStatusColor('up-to-date')}>Approved</Badge>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-2">Learning Objectives:</p>
                              <ul className="list-disc pl-5 text-sm space-y-1">
                                <li>Understand basic concepts and terminology</li>
                                <li>Apply fundamental principles to real-world scenarios</li>
                                <li>Demonstrate problem-solving skills</li>
                              </ul>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Week 3-4: Advanced Topics</CardTitle>
                              <Badge className={getStatusColor('pending')}>Pending Review</Badge>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-2">Learning Objectives:</p>
                              <ul className="list-disc pl-5 text-sm space-y-1">
                                <li>Analyze complex problems and solutions</li>
                                <li>Synthesize information from multiple sources</li>
                                <li>Evaluate different approaches and methodologies</li>
                              </ul>
                              <div className="mt-4 space-y-2">
                                <Label htmlFor="review-comments">Review Comments</Label>
                                <Textarea id="review-comments" placeholder="Add your review comments..." />
                                <div className="flex space-x-2">
                                  <Button size="sm">Approve</Button>
                                  <Button variant="outline" size="sm">Request Changes</Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={gradeReportsOpen} onOpenChange={setGradeReportsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" size="sm">
                        View Grade Reports
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Grade Reports - {selectedTeacher.name}</DialogTitle>
                        <DialogDescription>
                          View grading progress and student performance for {selectedTeacher.subject}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Graded Assignments</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">24/28</div>
                              <p className="text-xs text-muted-foreground">85.7% Complete</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Class Average</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">82.5%</div>
                              <p className="text-xs text-muted-foreground">Above target</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Pending Reviews</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">4</div>
                              <p className="text-xs text-muted-foreground">Due this week</p>
                            </CardContent>
                          </Card>
                        </div>
                        <Card>
                          <CardHeader>
                            <CardTitle>Recent Assessments</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 border rounded">
                                <div>
                                  <p className="font-medium">Midterm Exam</p>
                                  <p className="text-sm text-muted-foreground">Class 10A - Mathematics</p>
                                </div>
                                <Badge className={getStatusColor('complete')}>Graded</Badge>
                              </div>
                              <div className="flex justify-between items-center p-3 border rounded">
                                <div>
                                  <p className="font-medium">Assignment 5</p>
                                  <p className="text-sm text-muted-foreground">Class 10B - Mathematics</p>
                                </div>
                                <Badge className={getStatusColor('pending')}>Pending</Badge>
                              </div>
                              <div className="flex justify-between items-center p-3 border rounded">
                                <div>
                                  <p className="font-medium">Quiz 3</p>
                                  <p className="text-sm text-muted-foreground">Class 10C - Mathematics</p>
                                </div>
                                <Badge className={getStatusColor('overdue')}>Overdue</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" size="sm">
                        Schedule Meeting
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule Meeting with {selectedTeacher.name}</DialogTitle>
                        <DialogDescription>
                          Schedule a supervision meeting to discuss performance and provide feedback
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="meeting-purpose">Meeting Purpose</Label>
                          <select id="meeting-purpose" className="w-full p-2 border rounded-md">
                            <option>Performance Review</option>
                            <option>Lesson Plan Discussion</option>
                            <option>Student Progress</option>
                            <option>Professional Development</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="meeting-date">Date</Label>
                            <Input type="date" id="meeting-date" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="meeting-time">Time</Label>
                            <Input type="time" id="meeting-time" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                          <select id="meeting-duration" className="w-full p-2 border rounded-md">
                            <option>30</option>
                            <option>45</option>
                            <option>60</option>
                            <option>90</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meeting-notes">Agenda/Notes</Label>
                          <Textarea id="meeting-notes" placeholder="Add agenda items or notes for the meeting..." rows={4} />
                        </div>
                        <div className="flex space-x-2">
                          <Button className="flex-1">Schedule Meeting</Button>
                          <Button variant="outline" onClick={() => setMeetingOpen(false)}>Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Teacher Selected</h3>
                <p className="text-muted-foreground text-center">
                  Select a teacher from the list to view detailed supervision information.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSupervision;