import { type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, type AppRole, dashboardPathFor } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "./dashboard-layout";

export function RoleGuard({ role, children }: { role: AppRole; children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (profile.role !== role) {
    return <Navigate to={dashboardPathFor(profile.role) as any} />;
  }
  return <DashboardLayout role={role}>{children}</DashboardLayout>;
}
