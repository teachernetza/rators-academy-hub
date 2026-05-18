import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Copy, Loader2 } from "lucide-react";
import { adminListUsers, adminCreateUser, adminDeleteUser, adminToggleActive } from "@/lib/admin.functions";
import { toast } from "sonner";

type Role = "teacher" | "student";

export function makeUsersPage(role: Role, title: string) {
  return function UsersPage() {
    const qc = useQueryClient();
    const fetchUsers = useServerFn(adminListUsers);
    const createUser = useServerFn(adminCreateUser);
    const deleteUser = useServerFn(adminDeleteUser);
    const toggleActive = useServerFn(adminToggleActive);

    const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchUsers({}) });
    const filtered = (usersQ.data ?? []).filter((u) => u.role === role);

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);

    const createM = useMutation({
      mutationFn: (vars: { full_name: string; email: string }) =>
        createUser({ data: { ...vars, role } }),
      onSuccess: (res) => {
        toast.success("Account created");
        setCreatedInfo({ email: res.email, password: res.password });
        setName(""); setEmail("");
        qc.invalidateQueries({ queryKey: ["admin"] });
      },
      onError: (e: any) => toast.error(e.message ?? "Failed"),
    });

    const deleteM = useMutation({
      mutationFn: (id: string) => deleteUser({ data: { id } }),
      onSuccess: () => {
        toast.success("Deleted");
        qc.invalidateQueries({ queryKey: ["admin"] });
      },
      onError: (e: any) => toast.error(e.message ?? "Failed"),
    });

    const toggleM = useMutation({
      mutationFn: (vars: { id: string; is_active: boolean }) => toggleActive({ data: vars }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
      onError: (e: any) => toast.error(e.message ?? "Failed"),
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">{title}</h1>
            <p className="mt-1 text-muted-foreground">Manage {role} accounts.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreatedInfo(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create {role}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create new {role}</DialogTitle>
              </DialogHeader>
              {createdInfo ? (
                <div className="space-y-4">
                  <p className="text-sm">Account created. Share these credentials — the password is shown only once.</p>
                  <div className="rounded-lg border border-border bg-muted p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-mono">{createdInfo.email}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Password</span>
                      <span className="flex items-center gap-2 font-mono">{createdInfo.password}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(createdInfo.password); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                      </span>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={() => { setOpen(false); setCreatedInfo(null); }}>Done</Button></DialogFooter>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); createM.mutate({ full_name: name, email }); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <p className="text-xs text-muted-foreground">A secure password will be auto-generated and shown once.</p>
                  <DialogFooter>
                    <Button type="submit" disabled={createM.isPending}>
                      {createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell>
                    <Badge className="capitalize" variant={u.status === "active" ? "default" : "outline"}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${u.full_name}?`)) deleteM.mutate(u.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No {role}s yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };
}
