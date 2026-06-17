import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DollarSign,
  Wallet,
  CalendarCheck,
  User,
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Finance Workspace', href: '/bursar', icon: Wallet },
  { name: 'Appointments', href: '/bursar/appointments', icon: CalendarCheck },
  { name: 'Profile', href: '/bursar/profile', icon: User },
];

const BursarLayout = () => {
  const { signOut, profile } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
  };

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ResponsiveHeader
        portalName="Bursar Portal"
        portalIcon={DollarSign}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Bursar Portal"
            portalIcon={DollarSign}
            userName={userName}
            onSignOut={handleSignOut}
          />
        )}

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BursarLayout;
