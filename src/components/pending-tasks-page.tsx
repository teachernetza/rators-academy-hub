import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

export function PendingTasksPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const tasks = useQuery({
    queryKey: ["tasks", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_tasks")
        .select("id,title,due_date,completed")
        .eq("user_id", profile!.id)
        .order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("pending_tasks").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Pending</h1>
        <p className="mt-1 text-muted-foreground">Things that need your attention.</p>
      </div>
      <Card className="p-6 space-y-2">
        {(tasks.data ?? []).map((t) => (
          <label key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/40">
            <Checkbox checked={t.completed} onCheckedChange={(v) => toggle.mutate({ id: t.id, completed: !!v })} />
            <div className="flex-1">
              <p className={t.completed ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</p>
              {t.due_date && <p className="text-xs text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString()}</p>}
            </div>
          </label>
        ))}
        {tasks.data?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No pending tasks. You're all caught up!</p>
          </div>
        )}
      </Card>
    </div>
  );
}
