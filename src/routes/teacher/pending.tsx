import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PendingTasksPage } from "@/components/pending-tasks-page";

export const Route = createFileRoute("/teacher/pending")({
  component: () => <RoleGuard role="teacher"><PendingTasksPage /></RoleGuard>,
});
