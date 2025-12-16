import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  BookOpen, 
  Calendar, 
  User,
  GraduationCap,
  Library,
  BarChart3,
  CalendarCheck
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/student', icon: BookOpen },
  { name: 'My Subjects', href: '/student/subjects', icon: GraduationCap },
  { name: 'Schedule', href: '/student/schedule', icon: Calendar },
  { name: 'Grades', href: '/student/grades', icon: BarChart3 },
  { name: 'Library', href: '/student/library', icon: Library },
  { name: 'Appointments', href: '/student/appointments', icon: CalendarCheck },
  { name: 'Profile', href: '/student/profile', icon: User },
];

const StudentLayout = () => {
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
        portalName="Student Portal"
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
            portalName="Student Portal"
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

export default StudentLayout;
