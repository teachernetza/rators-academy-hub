import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/student/courses")({
  component: () => <RoleGuard role="student"><StudentCourses /></RoleGuard>,
});

function StudentCourses() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">My Courses</h1>
        <p className="mt-1 text-muted-foreground">Pick up where you left off.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(enrollments.data ?? []).map((e) => (
          <Card key={e.id} className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold">{e.courses?.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{e.courses?.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={e.progress} className="flex-1" />
              <span className="text-sm font-semibold text-primary">{e.progress}%</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
