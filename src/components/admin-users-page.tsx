import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy, Loader2, Search, Trash2, Pencil, KeyRound, ShieldCheck } from "lucide-react";
import {
  adminListUsers, adminCreateUser, adminDeleteUser, adminToggleActive,
  adminUpdateUser, adminUpdateRole, adminResetPassword,
} from "@/lib/admin.functions";
import { AssignActivityDialog } from "@/components/activities/assign-activity-dialog";
import { StudentProfileDialog } from "@/components/activities/student-profile-dialog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Role = "teacher" | "student";
type UserRow = {
  id: string; full_name: string | null; role: "admin" | "teacher" | "student";
  status: string | null; is_active: boolean | null; created_at: string; email: string;
};

function CredentialsBlock({ email, password, onDone }: { email: string; password: string; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm">Comparte estas credenciales — la contraseña se muestra una sola vez.</p>
      <div className="rounded-lg border border-border bg-muted p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-mono">{email}</span></div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Contraseña</span>
          <span className="flex items-center gap-2 font-mono">
            {password}
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(password); toast.success("Copiado"); }}>
              <Copy className="h-3 w-3" />
            </Button>
          </span>
        </div>
      </div>
      <DialogFooter><Button onClick={onDone}>Listo</Button></DialogFooter>
    </div>
  );
}

export function makeUsersPage(role: Role, title: string) {
  return function UsersPage() {
    const qc = useQueryClient();
    const { profile } = useAuth();
    const isAdmin = profile?.role === "admin";
    const fetchUsers = useServerFn(adminListUsers);
    const createUser = useServerFn(adminCreateUser);
    const deleteUser = useServerFn(adminDeleteUser);
    const toggleActive = useServerFn(adminToggleActive);
    const updateUser = useServerFn(adminUpdateUser);
    const updateRole = useServerFn(adminUpdateRole);
    const resetPassword = useServerFn(adminResetPassword);

    const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchUsers({}) });

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    const filtered = useMemo<UserRow[]>(() => {
      const rows = (usersQ.data ?? []).filter((u) => u.role === role) as UserRow[];
      const q = search.trim().toLowerCase();
      return rows.filter((u) => {
        if (statusFilter === "active" && u.is_active === false) return false;
        if (statusFilter === "inactive" && u.is_active !== false) return false;
        if (!q) return true;
        return (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
      });
    }, [usersQ.data, role, search, statusFilter]);

    // Create
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
    const createM = useMutation({
      mutationFn: (vars: { full_name: string; email: string }) => createUser({ data: { ...vars, role } }),
      onSuccess: (res) => {
        toast.success("Cuenta creada");
        setCreated({ email: res.email, password: res.password });
        setName(""); setEmail("");
        qc.invalidateQueries({ queryKey: ["admin"] });
      },
      onError: (e: any) => toast.error(e.message ?? "Error al crear"),
    });

    // Edit
    const [editUser, setEditUser] = useState<UserRow | null>(null);
    const [editName, setEditName] = useState("");
    const editM = useMutation({
      mutationFn: (vars: { id: string; full_name: string }) => updateUser({ data: vars }),
      onSuccess: () => {
        toast.success("Actualizado"); setEditUser(null);
        qc.invalidateQueries({ queryKey: ["admin"] });
      },
      onError: (e: any) => toast.error(e.message ?? "Error"),
    });

    // Role
    const [roleUser, setRoleUser] = useState<UserRow | null>(null);
    const [newRole, setNewRole] = useState<"admin" | "teacher" | "student">("student");
    const roleM = useMutation({
      mutationFn: (vars: { id: string; role: "admin" | "teacher" | "student" }) => updateRole({ data: vars }),
      onSuccess: () => {
        toast.success("Rol actualizado"); setRoleUser(null);
        qc.invalidateQueries({ queryKey: ["admin"] });
      },
      onError: (e: any) => toast.error(e.message ?? "Error"),
    });

    // Reset password
    const [resetUser, setResetUser] = useState<UserRow | null>(null);
    const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
    const resetM = useMutation({
      mutationFn: (id: string) => resetPassword({ data: { id } }),
      onSuccess: (res) => {
        if (resetUser) setResetResult({ email: resetUser.email, password: res.password });
        toast.success("Contraseña restablecida");
      },
      onError: (e: any) => toast.error(e.message ?? "Error"),
    });

    const deleteM = useMutation({
      mutationFn: (id: string) => deleteUser({ data: { id } }),
      onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["admin"] }); },
      onError: (e: any) => toast.error(e.message ?? "Error"),
    });

    const toggleM = useMutation({
      mutationFn: (vars: { id: string; is_active: boolean }) => toggleActive({ data: vars }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
      onError: (e: any) => toast.error(e.message ?? "Error"),
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">{title}</h1>
            <p className="mt-1 text-muted-foreground">Administra las cuentas de {role === "teacher" ? "docentes" : "estudiantes"}.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreated(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Crear {role === "teacher" ? "docente" : "estudiante"}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva cuenta</DialogTitle></DialogHeader>
              {created ? (
                <CredentialsBlock email={created.email} password={created.password} onDone={() => { setCreateOpen(false); setCreated(null); }} />
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); createM.mutate({ full_name: name, email }); }} className="space-y-4">
                  <div className="space-y-2"><Label>Nombre completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <p className="text-xs text-muted-foreground">Se generará una contraseña segura que se mostrará una sola vez.</p>
                  <DialogFooter>
                    <Button type="submit" disabled={createM.isPending}>
                      {createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={u.is_active !== false} onCheckedChange={(v) => toggleM.mutate({ id: u.id, is_active: v })} />
                      <span className="text-xs text-muted-foreground">{u.is_active !== false ? "Activo" : "Inactivo"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {role === "student" && (
                        <>
                          <StudentProfileDialog studentId={u.id} studentName={u.full_name || undefined}
                            trigger={<Button size="sm" variant="outline">Perfil</Button>} />
                          <AssignActivityDialog studentId={u.id} studentName={u.full_name || undefined}
                            trigger={<Button size="sm" variant="outline">Asignar</Button>} />
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditUser(u); setEditName(u.full_name || ""); }}>
                            <Pencil className="mr-2 h-4 w-4" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setResetUser(u); setResetResult(null); }}>
                            <KeyRound className="mr-2 h-4 w-4" />Restablecer contraseña
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => { setRoleUser(u); setNewRole(u.role); }}>
                              <ShieldCheck className="mr-2 h-4 w-4" />Cambiar rol
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { if (confirm(`¿Eliminar a ${u.full_name}?`)) deleteM.mutate(u.id); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin resultados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Edit dialog */}
        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (editUser) editM.mutate({ id: editUser.id, full_name: editName }); }} className="space-y-4">
              <div className="space-y-2"><Label>Nombre completo</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
              <DialogFooter>
                <Button type="submit" disabled={editM.isPending}>
                  {editM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Role dialog */}
        <Dialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar rol</DialogTitle>
              <DialogDescription>{roleUser?.full_name || roleUser?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button onClick={() => roleUser && roleM.mutate({ id: roleUser.id, role: newRole })} disabled={roleM.isPending}>
                  {roleM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aplicar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset password dialog */}
        <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) { setResetUser(null); setResetResult(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restablecer contraseña</DialogTitle>
              <DialogDescription>{resetUser?.full_name || resetUser?.email}</DialogDescription>
            </DialogHeader>
            {resetResult ? (
              <CredentialsBlock email={resetResult.email} password={resetResult.password} onDone={() => { setResetUser(null); setResetResult(null); }} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Se generará una nueva contraseña y la anterior dejará de funcionar. Comparte la nueva con el usuario.</p>
                <DialogFooter>
                  <Button onClick={() => resetUser && resetM.mutate(resetUser.id)} disabled={resetM.isPending}>
                    {resetM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generar nueva contraseña
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };
}
