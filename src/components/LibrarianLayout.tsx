import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Home,
  Library,
  Bookmark,
  AlertTriangle,
  CalendarCheck,
  User
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/librarian', icon: Home },
  { name: 'Catalog', href: '/librarian/catalog', icon: BookOpen },
  { name: 'Transactions', href: '/librarian/transactions', icon: Users },
  { name: 'Reservations', href: '/librarian/reservations', icon: Bookmark },
  { name: 'Fines', href: '/librarian/fines', icon: AlertTriangle },
  { name: 'Reports', href: '/librarian/reports', icon: BarChart3 },
  { name: 'Appointments', href: '/librarian/appointments', icon: CalendarCheck },
  { name: 'Profile', href: '/librarian/profile', icon: User },
];

const LibrarianLayout = () => {
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
        portalName="Library Portal"
        portalIcon={Library}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Library Portal"
            portalIcon={Library}
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

export default LibrarianLayout;
