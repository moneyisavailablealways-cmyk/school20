import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatusIndicator';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Badge } from '@/components/ui/badge';
import { useSchoolLevel } from '@/hooks/useSchoolLevel';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface ResponsiveSidebarProps {
  navigation: NavigationItem[];
  portalName: string;
  portalIcon: LucideIcon;
  userName?: string;
  onSignOut: () => void;
}

export function ResponsiveSidebar({
  navigation,
  portalName,
  portalIcon: PortalIcon,
  userName,
  onSignOut,
}: ResponsiveSidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close sidebar when resizing from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Portal Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <PortalIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">{portalName}</h2>
            {userName && (
              <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                {userName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => isMobile && setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-border/50 mt-auto">
        <Button
          onClick={onSignOut}
          variant="ghost"
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  // Mobile: Sheet/Drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="w-64 p-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        >
          <NavContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed Sidebar
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/30">
      <NavContent />
    </aside>
  );
}

// Mobile Header Component for consistent header across portals
interface MobileHeaderProps {
  portalName: string;
  portalIcon: LucideIcon;
  userName?: string;
  onSignOut: () => void;
  navigation: NavigationItem[];
}

const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  higher_institution: 'Higher Institution',
};

const SCHOOL_LEVEL_COLORS: Record<string, string> = {
  primary: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  secondary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  higher_institution: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export function ResponsiveHeader({
  portalName,
  portalIcon: PortalIcon,
  userName,
  onSignOut,
  navigation,
}: MobileHeaderProps) {
  const isMobile = useIsMobile();
  const { schoolLevel } = useSchoolLevel();

  return (
    <div>
      <header className="sticky top-0 z-40 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          {/* Mobile Menu Button */}
          {isMobile && (
            <ResponsiveSidebar
              navigation={navigation}
              portalName={portalName}
              portalIcon={PortalIcon}
              userName={userName}
              onSignOut={onSignOut}
            />
          )}

          {/* Portal Title - Desktop shows full, mobile shows compact */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <PortalIcon className="h-6 w-6 text-primary shrink-0 hidden md:block" />
            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">{portalName}</h1>
              {schoolLevel && (
                <Badge variant="outline" className={cn("text-xs font-medium shrink-0 border-0", SCHOOL_LEVEL_COLORS[schoolLevel])}>
                  {SCHOOL_LEVEL_LABELS[schoolLevel]}
                </Badge>
              )}
            </div>
            {userName && !isMobile && (
              <p className="text-sm text-muted-foreground truncate hidden lg:block">
                Welcome, {userName}
              </p>
            )}
          </div>

          {/* Connection Status Indicator */}
          <ConnectionStatusIndicator />

          {/* Sign Out - Desktop only (mobile has it in drawer) */}
          {!isMobile && (
            <Button onClick={onSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </header>
      <OfflineBanner />
    </div>
  );
}
