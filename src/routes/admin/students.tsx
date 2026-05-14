import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { makeUsersPage } from "@/components/admin-users-page";

const Page = makeUsersPage("student", "Students");

export const Route = createFileRoute("/admin/students")({
  component: () => <RoleGuard role="admin"><Page /></RoleGuard>,
});
