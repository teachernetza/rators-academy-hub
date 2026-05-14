import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/circular-progress";
import { BookOpen, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/student/dashboard")({
  component: () => <RoleGuard role="student"><StudentDashboard /></RoleGuard>,
});

function StudentDashboard() {
  const { profile } = useAuth();

  const enrollments = useQuery({
    queryKey: ["student", "enrollments", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, progress, enrolled_at, courses(title,description)")
        .eq("student_id", profile!.id);
      return (data ?? []) as any[];
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", profile?.id],
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

  const courses = enrollments.data ?? [];
  const overall = courses.length
    ? Math.round(courses.reduce((s, c) => s + (c.progress ?? 0), 0) / courses.length)
    : 0;
  const pending = (tasks.data ?? []).filter((t) => !t.completed);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "Student"}! <span className="ml-1">💪</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Keep going — small steps every day.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1 flex flex-col items-center justify-center text-center">
          <CircularProgress value={overall} label="overall" />
          <p className="mt-4 font-heading text-base font-semibold">Overall completion</p>
          <p className="text-xs text-muted-foreground">Across {courses.length} course{courses.length === 1 ? "" : "s"}</p>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Enrolled courses</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((e) => (
              <div key={e.id} className="rounded-lg border border-border p-4">
                <p className="font-medium">{e.courses?.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">Last activity {new Date(e.enrolled_at).toLocaleDateString()}</p>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={e.progress} className="flex-1" />
                  <span className="text-sm font-semibold text-primary">{e.progress}%</span>
                </div>
              </div>
            ))}
            {courses.length === 0 && <p className="text-sm text-muted-foreground">You're not enrolled in any courses yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-4"><ClipboardList className="h-5 w-5 text-primary" />Pending tasks</h2>
        <div className="space-y-2">
          {pending.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="font-medium">{t.title}</p>
              {t.due_date && <span className="text-xs text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString()}</span>}
            </div>
          ))}
          {pending.length === 0 && <p className="text-sm text-muted-foreground">All caught up. Nice work!</p>}
        </div>
      </Card>
    </div>
  );
}
