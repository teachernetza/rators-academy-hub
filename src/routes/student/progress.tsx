import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/circular-progress";

export const Route = createFileRoute("/student/progress")({
  component: () => <RoleGuard role="student"><StudentProgress /></RoleGuard>,
});

function StudentProgress() {
  const { profile } = useAuth();
  const enrollments = useQuery({
    queryKey: ["student", "enrollments", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, progress, courses(title)")
        .eq("student_id", profile!.id);
      return (data ?? []) as any[];
    },
  });
  const courses = enrollments.data ?? [];
  const overall = courses.length ? Math.round(courses.reduce((s, c) => s + (c.progress ?? 0), 0) / courses.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Progress</h1>
        <p className="mt-1 text-muted-foreground">Your journey at a glance.</p>
      </div>

      <Card className="p-8 flex flex-col items-center text-center">
        <CircularProgress value={overall} size={180} label="completed" />
        <p className="mt-4 font-heading text-lg font-semibold">Overall completion</p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-heading text-lg font-semibold">Per-course progress</h2>
        {courses.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.courses?.title}</p>
              <span className="text-sm font-semibold text-primary">{c.progress}%</span>
            </div>
            <Progress value={c.progress} className="mt-3" />
          </div>
        ))}
      </Card>
    </div>
  );
}
