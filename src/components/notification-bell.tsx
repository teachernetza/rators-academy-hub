import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listMyInvitations, respondInvitation } from "@/lib/invitations.functions";
import { toast } from "sonner";

export function NotificationBell() {
  const qc = useQueryClient();
  const fetchInv = useServerFn(listMyInvitations);
  const respond = useServerFn(respondInvitation);

  const inv = useQuery({
    queryKey: ["my-invitations"],
    queryFn: () => fetchInv({}),
    refetchInterval: 30000,
  });

  const respondM = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) => respond({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.accept ? "Invitation accepted" : "Invitation declined");
      qc.invalidateQueries({ queryKey: ["my-invitations"] });
      qc.invalidateQueries({ queryKey: ["student"] });
      qc.invalidateQueries({ queryKey: ["teacher"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const items = inv.data ?? [];
  const pending = items.filter((i: any) => i.status === "pending");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pending.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {pending.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-heading font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">{pending.length} pending invitation{pending.length === 1 ? "" : "s"}</p>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((i: any) => (
                <li key={i.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{i.inviter?.full_name ?? "Someone"}</span>{" "}
                        invited you to{" "}
                        <span className="font-medium">{i.courses?.title ?? "a course"}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px]">{i.role}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(i.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {i.message && <p className="mt-1.5 text-xs text-muted-foreground italic">"{i.message}"</p>}
                      {i.status === "pending" ? (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => respondM.mutate({ id: i.id, accept: true })} disabled={respondM.isPending}>
                            <Check className="mr-1 h-3 w-3" />Accept
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => respondM.mutate({ id: i.id, accept: false })} disabled={respondM.isPending}>
                            <X className="mr-1 h-3 w-3" />Decline
                          </Button>
                        </div>
                      ) : (
                        <Badge variant={i.status === "accepted" ? "default" : "outline"} className="mt-2 capitalize text-[10px]">
                          {i.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
