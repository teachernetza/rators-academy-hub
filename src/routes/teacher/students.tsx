import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teacherGetStudentMatrix } from "@/lib/grading.functions";
import { AssignActivityDialog } from "@/components/activities/assign-activity-dialog";
import { StudentProfileDialog } from "@/components/activities/student-profile-dialog";
import { listStudents } from "@/lib/activities.functions";
import { adminCreateUser } from "@/lib/admin.functions";
import { Copy, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/students")({
  component: () => <RoleGuard role="teacher"><Page /></RoleGuard>,
});

function Page() {
  const qc = useQueryClient();
  const fn = useServerFn(teacherGetStudentMatrix);
  const studentsFn = useServerFn(listStudents);
  const createUser = useServerFn(adminCreateUser);
  const q = useQuery({ queryKey: ["teacher-matrix"], queryFn: () => fn({}) });
  const allStudentsQ = useQuery({ queryKey: ["teacher", "students", "all"], queryFn: () => studentsFn() });
  const data = q.data ?? { courses: [], students: [], cells: {} };
  const students = allStudentsQ.data ?? data.students;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);

  const createM = useMutation({
    mutationFn: () => createUser({ data: { full_name: name, email, role: "student" } }),
    onSuccess: (res) => {
      toast.success("Estudiante creado");
      setCreatedInfo({ email: res.email, password: res.password });
      setName("");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["teacher", "students"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo crear"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold">Students</h1>
          <p className="mt-1 text-muted-foreground">Crea alumnos, revisa su perfil y asígnales actividades.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreatedInfo(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Crear estudiante</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear estudiante</DialogTitle></DialogHeader>
            {createdInfo ? (
              <div className="space-y-4">
                <p className="text-sm">Cuenta creada. Comparte estas credenciales con el estudiante.</p>
                <div className="rounded-lg border border-border bg-muted p-4 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Correo</span><span className="font-mono">{createdInfo.email}</span></div>
                  <div className="mt-2 flex items-center justify-between gap-3"><span className="text-muted-foreground">Contraseña</span><span className="flex items-center gap-2 font-mono">{createdInfo.password}<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(createdInfo.password); toast.success("Copiado"); }}><Copy className="h-3 w-3" /></Button></span></div>
                </div>
                <DialogFooter><Button onClick={() => { setOpen(false); setCreatedInfo(null); }}>Listo</Button></DialogFooter>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); createM.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Nombre completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <p className="text-xs text-muted-foreground">La contraseña se generará automáticamente y se mostrará una sola vez.</p>
                <DialogFooter><Button type="submit" disabled={createM.isPending}>{createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear</Button></DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              {data.courses.map((c: any) => <TableHead key={c.id} className="text-center">{c.title}</TableHead>)}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                {data.courses.map((c: any) => {
                  const v = data.cells[s.id]?.[c.id];
                  return (
                    <TableCell key={c.id} className="text-center">
                      {v != null ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">{v}%</span>
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <StudentProfileDialog studentId={s.id} studentName={s.full_name} />
                    <AssignActivityDialog studentId={s.id} studentName={s.full_name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow><TableCell colSpan={data.courses.length + 2} className="text-center text-muted-foreground py-8">No enrolled students yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
