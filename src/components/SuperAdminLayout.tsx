import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  School,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  BarChart3,
  Globe,
  Users,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/super-admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/super-admin/schools', icon: School, label: 'Schools' },
  { to: '/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/super-admin/users', icon: Users, label: 'Platform Users' },
  { to: '/super-admin/settings', icon: Settings, label: 'Platform Settings' },
];

const SuperAdminLayout = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Super Admin</h1>
            <p className="text-xs text-slate-400">Platform Control</p>
          </div>
        </div>
      </div>

      {/* Platform badge */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-900/40 border border-violet-700/40">
          <Globe className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">School20 SaaS Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-700" />

      {/* User info */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile?.first_name} {profile?.last_name}</p>
            <Badge variant="outline" className="text-xs border-violet-500 text-violet-300 mt-0.5">Super Admin</Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0">
        <div className="w-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-600" />
            <span className="font-bold text-sm">Super Admin</span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Outlet />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
