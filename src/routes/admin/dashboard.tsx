import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Activity } from "lucide-react";
import { adminGetStats, adminListUsers } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/dashboard")({
  component: () => <RoleGuard role="admin"><AdminDashboard /></RoleGuard>,
});

function AdminDashboard() {
  const fetchStats = useServerFn(adminGetStats);
  const fetchUsers = useServerFn(adminListUsers);
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => fetchStats({}) });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchUsers({}) });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of Rators Academy.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={stats.data?.students ?? "—"} icon={Users} accent tone="primary" />
        <StatCard label="Teachers" value={stats.data?.teachers ?? "—"} icon={GraduationCap} accent tone="violet" />
        <StatCard label="Courses" value={stats.data?.courses ?? "—"} icon={BookOpen} accent tone="teal" />
        <StatCard label="Active Enrollments" value={stats.data?.enrollments ?? "—"} icon={Activity} accent tone="amber" />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent users</h2>
          <span className="text-sm text-muted-foreground">{users.data?.length ?? 0} total</span>
        </div>
        <div className="space-y-2">
          {(users.data ?? []).slice(0, 6).map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="font-medium">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                {u.role}
              </Badge>
            </div>
          ))}
          {users.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
