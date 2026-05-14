import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/teacher/students")({
  component: () => <RoleGuard role="teacher"><TeacherStudents /></RoleGuard>,
});

function TeacherStudents() {
  const { profile } = useAuth();
  const data = useQuery({
    queryKey: ["teacher", "students", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("progress, courses!inner(title,teacher_id), profiles!enrollments_student_id_fkey(full_name)")
        .eq("courses.teacher_id", profile!.id);
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Students</h1>
        <p className="mt-1 text-muted-foreground">Progress across your courses.</p>
      </div>
      <Card className="p-6 space-y-3">
        {(data.data ?? []).map((row, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{row.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">{row.courses?.title}</p>
              </div>
              <span className="text-sm font-semibold text-primary">{row.progress}%</span>
            </div>
            <Progress value={row.progress} className="mt-3" />
          </div>
        ))}
        {data.data?.length === 0 && <p className="text-sm text-muted-foreground">No students yet.</p>}
      </Card>
    </div>
  );
}
