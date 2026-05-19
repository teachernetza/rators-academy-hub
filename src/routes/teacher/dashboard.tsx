import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardList, Users, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/teacher/dashboard")({
  component: () => <RoleGuard role="teacher"><TeacherDashboard /></RoleGuard>,
});

function TeacherDashboard() {
  const { profile } = useAuth();

  const courses = useQuery({
    queryKey: ["teacher", "courses", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title,description").eq("teacher_id", profile!.id);
      return data ?? [];
    },
  });

  const tasks = useQuery({
    queryKey: ["teacher", "tasks", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_tasks")
        .select("id,title,due_date,completed")
        .eq("user_id", profile!.id)
        .order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  const progressList = useQuery({
    queryKey: ["teacher", "studentProgress", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("progress, courses!inner(title,teacher_id), profiles!enrollments_student_id_fkey(full_name)")
        .eq("courses.teacher_id", profile!.id);
      return (data ?? []) as any[];
    },
  });

  const pendingCount = (tasks.data ?? []).filter((t) => !t.completed).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Hello, {profile?.full_name?.split(" ")[0] ?? "Teacher"} 👋</h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening in your classes today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="My Courses" value={courses.data?.length ?? 0} icon={BookOpen} accent tone="primary" />
        <StatCard label="Pending tasks" value={pendingCount} icon={ClipboardList} accent tone="amber" />
        <StatCard label="Enrolled students" value={progressList.data?.length ?? 0} icon={Users} accent tone="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">My Courses</h2>
            <Badge variant="secondary">{courses.data?.length ?? 0}</Badge>
          </div>
          <div className="space-y-3">
            {(courses.data ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-4">
                <p className="font-medium">{c.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              </div>
            ))}
            {courses.data?.length === 0 && <p className="text-sm text-muted-foreground">No courses assigned yet.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Pending</h2>
          <p className="mt-1 text-sm text-muted-foreground">Quick highlights</p>
          <div className="mt-4 space-y-3">
            <Highlight icon={ClipboardList} label={`${pendingCount} tasks to review`} />
            <Highlight icon={MessageSquare} label={`${Math.min(2, pendingCount)} students need feedback`} />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Student progress</h2>
        <div className="space-y-3">
          {(progressList.data ?? []).map((row, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{row.profiles?.full_name ?? "Student"}</p>
                  <p className="text-xs text-muted-foreground">{row.courses?.title}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{row.progress}%</span>
              </div>
              <Progress value={row.progress} className="mt-3" />
            </div>
          ))}
          {progressList.data?.length === 0 && <p className="text-sm text-muted-foreground">No enrollments yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function Highlight({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-accent/50 px-3 py-2.5">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
