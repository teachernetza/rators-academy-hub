import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/teacher/courses")({
  component: () => <RoleGuard role="teacher"><TeacherCourses /></RoleGuard>,
});

function TeacherCourses() {
  const { profile } = useAuth();
  const courses = useQuery({
    queryKey: ["teacher", "coursesFull", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title,description,created_at").eq("teacher_id", profile!.id);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">My Courses</h1>
        <p className="mt-1 text-muted-foreground">Courses you teach.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(courses.data ?? []).map((c) => (
          <Card key={c.id} className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
