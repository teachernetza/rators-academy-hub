import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/circular-progress";
import { BookOpen, ClipboardList, CalendarDays, Megaphone, AlertTriangle, Clock } from "lucide-react";
import { listUpcomingForStudent } from "@/lib/calendar.functions";
import { listAnnouncements } from "@/lib/announcements.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/dashboard")({
  component: () => <RoleGuard role="student"><StudentDashboard /></RoleGuard>,
});

function StudentDashboard() {
  const { profile } = useAuth();
  const upcomingFn = useServerFn(listUpcomingForStudent);
  const annFn = useServerFn(listAnnouncements);

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

  const upcoming = useQuery({
    queryKey: ["calendar", "student", "dashboard"],
    queryFn: () => upcomingFn({ data: { days: 14 } }),
  });
  const announcements = useQuery({
    queryKey: ["announcements", "dashboard"],
    queryFn: () => annFn({ data: {} }),
  });

  const courses = enrollments.data ?? [];
  const overall = courses.length
    ? Math.round(courses.reduce((s, c) => s + (c.progress ?? 0), 0) / courses.length)
    : 0;
  const upcomingItems = (upcoming.data ?? []).slice(0, 5);
  const annItems = (announcements.data ?? []).slice(0, 3);
  const now = Date.now();

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Upcoming deadlines</h2>
            <Link to="/calendar" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {upcomingItems.map((it: any) => {
              const overdue = new Date(it.due_date).getTime() < now;
              return (
                <div key={it.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{it.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{it.course_title}</p>
                  </div>
                  <Badge variant={overdue ? "destructive" : "outline"} className="shrink-0 flex items-center gap-1">
                    {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {new Date(it.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Badge>
                </div>
              );
            })}
            {upcomingItems.length === 0 && <p className="text-sm text-muted-foreground">No deadlines in the next 2 weeks. Nice!</p>}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Latest announcements</h2>
            <Link to="/announcements" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {annItems.map((a: any) => (
              <Link key={a.id} to="/announcements" className={cn("block rounded-lg border border-border p-3 transition-colors hover:bg-accent/40", !a.read && "border-primary/40 bg-accent/20")}>
                <p className="font-medium text-sm truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">{a.course_title ?? "Platform-wide"} · {new Date(a.created_at).toLocaleDateString()}</p>
              </Link>
            ))}
            {annItems.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

