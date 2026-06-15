import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { ActivitiesLibrary } from "@/components/activities/activities-library";

export const Route = createFileRoute("/teacher/activities")({
  component: () => (
    <RoleGuard role="teacher">
      <ActivitiesLibrary basePath="/teacher/activities" />
    </RoleGuard>
  ),
});
