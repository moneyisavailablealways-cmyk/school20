import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  DollarSign, 
  FileText, 
  Receipt, 
  CreditCard, 
  BarChart3,
  User,
  Settings,
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  Banknote,
  Wallet,
  PieChart
} from 'lucide-react';
import { ResponsiveSidebar, ResponsiveHeader } from '@/components/ResponsiveSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/bursar', icon: BarChart3 },
  { name: 'Finance Dashboard', href: '/bursar/finance', icon: PieChart },
  { name: 'Fees Management', href: '/bursar/fees', icon: Wallet },
  { name: 'Salary Management', href: '/bursar/salaries', icon: Banknote },
  { name: 'Reports', href: '/bursar/reports', icon: Receipt },
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
      {/* Header */}
      <ResponsiveHeader
        portalName="Bursar Portal"
        portalIcon={DollarSign}
        userName={userName}
        onSignOut={handleSignOut}
        navigation={navigation}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ResponsiveSidebar
            navigation={navigation}
            portalName="Bursar Portal"
            portalIcon={DollarSign}
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

export default BursarLayout;
