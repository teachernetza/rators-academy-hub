import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { ActivitiesLibrary } from "@/components/activities/activities-library";

export const Route = createFileRoute("/admin/activities")({
  component: () => (
    <RoleGuard role="admin">
      <ActivitiesLibrary basePath="/admin/activities" />
    </RoleGuard>
  ),
});
