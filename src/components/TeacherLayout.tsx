import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  User,
  GraduationCap,
  CalendarCheck,
  ClipboardCheck
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/teacher', icon: BookOpen },
  { name: 'My Classes', href: '/teacher/classes', icon: Users },
  { name: 'Students', href: '/teacher/students', icon: GraduationCap },
  { name: 'Schedule', href: '/teacher/schedule', icon: Calendar },
  { name: 'Student Attendance', href: '/teacher/attendance', icon: ClipboardCheck },
  { name: 'My Attendance', href: '/teacher/my-attendance', icon: User },
  { name: 'Appointments', href: '/teacher/appointments', icon: CalendarCheck },
  { name: 'Profile', href: '/teacher/profile', icon: User },
];

const TeacherLayout = () => {
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
        portalName="Teacher Portal"
        portalIcon={BookOpen}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Teacher Portal"
            portalIcon={BookOpen}
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

export default TeacherLayout;
