import { createFileRoute, useParams } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { ActivityEditor } from "@/components/activities/activity-editor";

export const Route = createFileRoute("/teacher/activities/$id")({
  component: TeacherEditor,
});

function TeacherEditor() {
  const { id } = useParams({ strict: false }) as { id: string };
  return (
    <RoleGuard role="teacher">
      <ActivityEditor id={id} basePath="/teacher/activities" />
    </RoleGuard>
  );
}
