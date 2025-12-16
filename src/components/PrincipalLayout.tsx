import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart3, 
  FileCheck, 
  Shield,
  User,
  Building,
  FileText,
  TrendingUp,
  CheckSquare,
  CalendarCheck
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/principal', icon: BarChart3 },
  { name: 'Performance', href: '/principal/performance', icon: TrendingUp },
  { name: 'Approvals', href: '/principal/approvals', icon: CheckSquare },
  { name: 'Report Cards', href: '/principal/reports', icon: FileCheck },
  { name: 'Appointments', href: '/principal/appointments', icon: CalendarCheck },
  { name: 'Policies', href: '/principal/policies', icon: Shield },
  { name: 'Compliance', href: '/principal/compliance', icon: FileText },
  { name: 'Profile', href: '/principal/profile', icon: User },
];

const PrincipalLayout = () => {
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
        portalName="Principal Portal"
        portalIcon={Building}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Principal Portal"
            portalIcon={Building}
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

export default PrincipalLayout;
