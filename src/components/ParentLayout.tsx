import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  Bell, 
  Home,
  User
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/parent', icon: Home },
  { name: 'My Children', href: '/parent/children', icon: Users },
  { name: 'Attendance', href: '/parent/attendance', icon: Calendar },
  { name: 'Reports & Grades', href: '/parent/reports', icon: FileText },
  { name: 'Fees & Payments', href: '/parent/payments', icon: CreditCard },
  { name: 'Appointments', href: '/parent/appointments', icon: Calendar },
  { name: 'Announcements', href: '/parent/announcements', icon: Bell },
  { name: 'Profile', href: '/parent/profile', icon: User },
];

const ParentLayout = () => {
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
        portalName="Parent Portal"
        portalIcon={User}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Parent Portal"
            portalIcon={User}
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

export default ParentLayout;
