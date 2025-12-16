import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  Calendar,
  Settings,
  BarChart3,
  BookOpen,
  MessageCircle,
  School,
  Home,
  UserPlus,
  Building,
  Heart,
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Teacher Management', href: '/admin/teachers', icon: GraduationCap },
  { name: 'Parent Management', href: '/admin/parents', icon: Heart },
  { name: 'Student Management', href: '/admin/students', icon: GraduationCap },
  { name: 'Academic Structure', href: '/admin/academic', icon: Building },
  { name: 'Subject Management', href: '/admin/subjects', icon: BookOpen },
  { name: 'Admissions', href: '/admin/admissions', icon: UserPlus },
  { name: 'Timetable', href: '/admin/timetable', icon: Calendar },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Communications', href: '/admin/communications', icon: MessageCircle },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!profile || !['admin', 'principal'].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You need admin or principal privileges to access this area.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ResponsiveHeader
        portalName="Admin Portal"
        portalIcon={School}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Admin Portal"
            portalIcon={School}
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

export default AdminLayout;
