import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  ClipboardCheck,
  FileText,
  Brain,
  
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSchoolLevel } from '@/hooks/useSchoolLevel';

const buildNavigation = (isPrimary: boolean) => {
  const studentWord = isPrimary ? 'Learner' : 'Student';
  return [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Teacher Management', href: '/admin/teachers', icon: GraduationCap },
    { name: 'Parent Management', href: '/admin/parents', icon: Heart },
    { name: `${studentWord} Management`, href: '/admin/students', icon: GraduationCap },
    { name: 'Academic Structure', href: '/admin/academic', icon: Building },
    { name: 'Subject Management', href: '/admin/subjects', icon: BookOpen },
    { name: 'Admissions', href: '/admin/admissions', icon: UserPlus },
    { name: 'Timetable', href: '/admin/timetable', icon: Calendar },
    { name: `${studentWord} Attendance`, href: '/admin/attendance', icon: ClipboardCheck },
    
    { name: 'Teacher Attendance', href: '/admin/teacher-attendance', icon: Users },
    { name: 'Report Cards', href: '/admin/report-cards', icon: FileText },
    { name: 'Academic Risk', href: '/admin/academic-risk', icon: Brain },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Communications', href: '/admin/communications', icon: MessageCircle },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];
};


const AdminLayout = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { schoolLevel } = useSchoolLevel();



  // CRITICAL: wait for both auth + profile to fully resolve before running
  // any authorization checks. Without this, profile is briefly null on first
  // render and produces a false "Access Denied" popup for admins.
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isTeacherManagementRoute =
    location.pathname === '/admin/teachers' || location.pathname === '/admin/add-teacher';
  const hasTeacherManagementOnlyAccess = profile?.role === 'head_teacher' && isTeacherManagementRoute;
  const canAccessAdminLayout = !!profile && (['admin', 'principal'].includes(profile.role) || hasTeacherManagementOnlyAccess);

  if (!canAccessAdminLayout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            {profile?.role === 'head_teacher'
              ? 'You can only access teacher management from this area.'
              : 'You need admin or principal privileges to access this area.'}
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

  const navigation = buildNavigation(schoolLevel === 'primary');

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : undefined;
  const activeNavigation = hasTeacherManagementOnlyAccess
    ? navigation.filter((item) => item.href === '/admin/teachers')
    : navigation;


  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ResponsiveHeader
        portalName="Admin Portal"
        portalIcon={School}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={activeNavigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={activeNavigation}
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
