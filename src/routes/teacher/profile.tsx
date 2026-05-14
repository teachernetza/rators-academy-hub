import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { ProfilePage } from "@/components/profile-page";

export const Route = createFileRoute("/teacher/profile")({
  component: () => <RoleGuard role="teacher"><ProfilePage /></RoleGuard>,
});
