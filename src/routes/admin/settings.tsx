import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: () => (
    <RoleGuard role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">Workspace settings coming soon.</p>
        </div>
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <p className="font-heading text-lg font-semibold">Configure your academy</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Branding, policies, and integrations will be configurable here.
          </p>
        </Card>
      </div>
    </RoleGuard>
  ),
});
