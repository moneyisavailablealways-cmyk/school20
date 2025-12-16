import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  FileCheck, 
  AlertTriangle,
  Calendar,
  BarChart3,
  User,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
  UserCheck
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/head-teacher', icon: BarChart3 },
  { name: 'Teacher Supervision', href: '/head-teacher/supervision', icon: Users },
  { name: 'Marks Approval', href: '/head-teacher/marks', icon: FileCheck },
  { name: 'Discipline Records', href: '/head-teacher/discipline', icon: AlertTriangle },
  { name: 'Timetable Management', href: '/head-teacher/timetable', icon: Calendar },
  { name: 'Student Attendance', href: '/head-teacher/attendance', icon: UserCheck },
  { name: 'Teacher Attendance', href: '/head-teacher/teacher-attendance', icon: Users },
  { name: 'Academic Reports', href: '/head-teacher/reports', icon: ClipboardCheck },
  { name: 'Appointments', href: '/head-teacher/appointments', icon: CalendarCheck },
  { name: 'Profile', href: '/head-teacher/profile', icon: User },
];

const HeadTeacherLayout = () => {
  const { signOut, profile } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
  };

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ResponsiveHeader
        portalName="Head Teacher Portal"
        portalIcon={GraduationCap}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Head Teacher Portal"
            portalIcon={GraduationCap}
            userName={userName}
            onSignOut={handleSignOut}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default HeadTeacherLayout;
