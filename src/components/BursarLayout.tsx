import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  FileText, 
  Receipt, 
  CreditCard, 
  BarChart3,
  User,
  LogOut,
  Settings,
  GraduationCap,
  Calculator
} from 'lucide-react';

const BursarLayout = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/bursar', icon: BarChart3 },
    { name: 'Fee Structures', href: '/bursar/fee-structures', icon: Settings },
    { name: 'Invoices', href: '/bursar/invoices', icon: FileText },
    { name: 'Payments', href: '/bursar/payments', icon: CreditCard },
    { name: 'Scholarships', href: '/bursar/scholarships', icon: GraduationCap },
    { name: 'Reports', href: '/bursar/reports', icon: Receipt },
    { name: 'Profile', href: '/bursar/profile', icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Bursar Portal</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {profile?.first_name} {profile?.last_name}
              </p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 border-r bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <div className="space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BursarLayout;