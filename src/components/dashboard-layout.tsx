import { type ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, BookOpen, Settings, LogOut,
  ClipboardList, UserCircle, Menu, BarChart3, Compass, Award,
  Megaphone, CalendarDays, FileText, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notification-bell";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<AppRole, NavItem[]> = {
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
    { to: "/admin/students", label: "Students", icon: Users },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/activities", label: "Activities", icon: FileText },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
  teacher: [
    { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/teacher/courses", label: "My Courses", icon: BookOpen },
    { to: "/teacher/students", label: "Students", icon: Users },
    { to: "/teacher/activities", label: "Activities", icon: FileText },
    { to: "/teacher/inbox", label: "Review Inbox", icon: Inbox },
    { to: "/teacher/grading", label: "Grading", icon: ClipboardList },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/teacher/pending", label: "Pending", icon: ClipboardList },
    { to: "/teacher/profile", label: "Profile", icon: UserCircle },
  ],
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student/courses", label: "My Courses", icon: BookOpen },
    { to: "/student/activities", label: "Activities", icon: FileText },
    { to: "/student/catalog", label: "Catalog", icon: Compass },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/student/progress", label: "Progress", icon: BarChart3 },
    { to: "/student/certificates", label: "Certificates", icon: Award },
    { to: "/student/pending", label: "Pending", icon: ClipboardList },
    { to: "/student/profile", label: "Profile", icon: UserCircle },
  ],
};

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  teacher: "Instructor",
  student: "Student",
};

export function DashboardLayout({ role, children }: { role: AppRole; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[role];

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <SidebarContent items={items} role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent items={items} role={role} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="lg:hidden flex items-center gap-2">
              <img src="/icono_teacher_netza.png" alt="Teacher Netza" className="h-8 w-8 object-contain" />
              <span className="font-heading text-base font-bold">Teacher Netza</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-sm font-semibold text-foreground">{profile?.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
            </div>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  items, role, onNavigate,
}: { items: NavItem[]; role: AppRole; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <img src="/icono_teacher_netza.png" alt="Teacher Netza" className="h-9 w-9 object-contain" />
        <div>
          <p className="font-heading text-base font-bold text-sidebar-foreground">Teacher Netza</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        © Teacher Netza
      </div>
    </div>
  );
}
