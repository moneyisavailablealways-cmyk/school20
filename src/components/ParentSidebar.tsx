import { useLocation } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  CreditCard, 
  Bell, 
  FileText, 
  UserCheck,
  MessageSquare
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";

const navigation = [
  { name: "Dashboard", href: "/parent", icon: Home },
  { name: "Child's Progress", href: "/parent/progress", icon: UserCheck },
  { name: "Attendance", href: "/parent/attendance", icon: Calendar },
  { name: "Report Cards", href: "/parent/reports", icon: FileText },
  { name: "Behavior Notes", href: "/parent/behavior", icon: MessageSquare },
  { name: "Fee Payments", href: "/parent/payments", icon: CreditCard },
  { name: "Appointments", href: "/parent/appointments", icon: Calendar },
  { name: "Announcements", href: "/parent/announcements", icon: Bell },
];

export function ParentSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden group-data-[collapsible=icon]:block">{/* collapsed content */}</div>
          <div className="block group-data-[collapsible=icon]:hidden">{/* expanded content */}
            <div>
              <h1 className="font-semibold text-sm">Parent Portal</h1>
              <p className="text-xs text-muted-foreground">School Management</p>
            </div>
          </div>
        </div>
        <SidebarTrigger className="ml-auto" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent ${
                          isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}