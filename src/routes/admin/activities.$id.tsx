import { createFileRoute, useParams } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { ActivityEditor } from "@/components/activities/activity-editor";

export const Route = createFileRoute("/admin/activities/$id")({
  component: AdminEditor,
});

function AdminEditor() {
  const { id } = useParams({ strict: false }) as { id: string };
  return (
    <RoleGuard role="admin">
      <ActivityEditor id={id} basePath="/admin/activities" />
    </RoleGuard>
  );
}
