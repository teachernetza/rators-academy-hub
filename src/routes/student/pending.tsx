import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PendingTasksPage } from "@/components/pending-tasks-page";

export const Route = createFileRoute("/student/pending")({
  component: () => <RoleGuard role="student"><PendingTasksPage /></RoleGuard>,
});
