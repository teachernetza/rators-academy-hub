import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { listMyCourses } from "@/lib/student-course.functions";
import { BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/student/courses")({
  component: () => <RoleGuard role="student"><Page /></RoleGuard>,
});

function Page() {
  const fn = useServerFn(listMyCourses);
  const q = useQuery({ queryKey: ["my-courses"], queryFn: () => fn({}) });
  const courses = q.data ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">My Courses</h1>
        <p className="mt-1 text-muted-foreground">Continue where you left off.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((e: any) => (
          <Card key={e.id} className="overflow-hidden flex flex-col">
            <div className="h-32 bg-gradient-to-br from-primary/15 to-primary/5">
              {e.courses?.cover_image_url && <img src={e.courses.cover_image_url} alt={e.courses.title} className="h-full w-full object-cover" />}
            </div>
            <div className="p-5 flex flex-col gap-3 flex-1">
              <h3 className="font-heading font-semibold">{e.courses?.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{e.courses?.description ?? ""}</p>
              <div className="flex items-center gap-3">
                <Progress value={e.progress} className="flex-1" />
                <span className="text-sm font-semibold text-primary">{e.progress}%</span>
              </div>
              <Link to="/student/courses/$courseId" params={{ courseId: e.course_id }} className="mt-auto">
                <Button className="w-full" size="sm">Continue<ChevronRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </div>
          </Card>
        ))}
        {courses.length === 0 && !q.isLoading && (
          <Card className="p-12 text-center text-muted-foreground md:col-span-2 lg:col-span-3 flex flex-col items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary/40" />
            You're not enrolled in any courses yet.
          </Card>
        )}
      </div>
    </div>
  );
}
