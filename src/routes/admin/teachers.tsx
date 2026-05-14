import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { makeUsersPage } from "@/components/admin-users-page";

const Page = makeUsersPage("teacher", "Teachers");

export const Route = createFileRoute("/admin/teachers")({
  component: () => <RoleGuard role="admin"><Page /></RoleGuard>,
});
