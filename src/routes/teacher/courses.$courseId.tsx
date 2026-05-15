import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { CourseBuilder } from "@/components/course-builder";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/teacher/courses/$courseId")({
  component: () => <RoleGuard role="teacher"><Page /></RoleGuard>,
});

function Page() {
  const { courseId } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link to="/teacher/courses"><Button variant="ghost" size="sm"><ChevronLeft className="mr-1 h-4 w-4" />Back</Button></Link>
      <CourseBuilder courseId={courseId} />
    </div>
  );
}
