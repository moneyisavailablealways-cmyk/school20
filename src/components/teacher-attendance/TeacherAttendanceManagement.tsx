import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, ClipboardList, FileText, Clock, Users } from 'lucide-react';
import TeacherAttendanceMarking from './TeacherAttendanceMarking';
import TeacherAttendanceCalendar from './TeacherAttendanceCalendar';
import TeacherLeaveRequests from './TeacherLeaveRequests';
import TeacherAttendanceReports from './TeacherAttendanceReports';
import TeacherAttendanceAnalytics from './TeacherAttendanceAnalytics';
import WeeklyAttendanceGrid from '@/components/attendance/WeeklyAttendanceGrid';

interface TeacherAttendanceManagementProps {
  title?: string;
  description?: string;
  isTeacherView?: boolean; // For teacher's own attendance view
}

const TeacherAttendanceManagement = ({
  title = "Teacher Attendance Management",
  description = "Manage teacher attendance, leave requests, and view reports",
  isTeacherView = false
}: TeacherAttendanceManagementProps) => {
  const [activeTab, setActiveTab] = useState('weekly');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="weekly" className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /><span>Weekly Grid</span></TabsTrigger>
          {!isTeacherView && (
            <TabsTrigger value="mark" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Mark Attendance</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Requests</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          {!isTeacherView && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="weekly"><WeeklyAttendanceGrid kind="teacher" personal={isTeacherView} /></TabsContent>

        {!isTeacherView && (
          <TabsContent value="mark">
            <TeacherAttendanceMarking />
          </TabsContent>
        )}

        <TabsContent value="calendar">
          <TeacherAttendanceCalendar isTeacherView={isTeacherView} />
        </TabsContent>

        <TabsContent value="leave">
          <TeacherLeaveRequests isTeacherView={isTeacherView} />
        </TabsContent>

        <TabsContent value="reports">
          <TeacherAttendanceReports isTeacherView={isTeacherView} />
        </TabsContent>

        {!isTeacherView && (
          <TabsContent value="analytics">
            <TeacherAttendanceAnalytics />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default TeacherAttendanceManagement;
