import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Calendar, 
  Settings,
  Home,
  LogOut,
  Library,
  Bookmark,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigation = [
  { name: 'Dashboard', href: '/librarian', icon: Home },
  { name: 'Catalog', href: '/librarian/catalog', icon: BookOpen },
  { name: 'Transactions', href: '/librarian/transactions', icon: Users },
  { name: 'Reservations', href: '/librarian/reservations', icon: Bookmark },
  { name: 'Fines', href: '/librarian/fines', icon: AlertTriangle },
  { name: 'Reports', href: '/librarian/reports', icon: BarChart3 },
];

const LibrarianLayout = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="w-64">
          <SidebarContent>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Library className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="font-bold text-foreground">Library Portal</h2>
                  <p className="text-sm text-muted-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                </div>
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Library Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.href} className={getNavCls}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 border-t">
              <Button 
                onClick={handleSignOut} 
                variant="ghost" 
                className="w-full justify-start"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-lg font-semibold text-foreground">Library Management</h1>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default LibrarianLayout;