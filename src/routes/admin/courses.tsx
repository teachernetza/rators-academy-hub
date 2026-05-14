import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/admin/courses")({
  component: () => (
    <RoleGuard role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Courses</h1>
          <p className="mt-1 text-muted-foreground">Course management coming soon.</p>
        </div>
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="font-heading text-lg font-semibold">Course catalog</p>
          <p className="max-w-md text-sm text-muted-foreground">
            You'll be able to create courses, assign instructors, and manage curricula here.
          </p>
        </Card>
      </div>
    </RoleGuard>
  ),
});
