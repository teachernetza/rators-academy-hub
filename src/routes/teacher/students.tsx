import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teacherGetStudentMatrix } from "@/lib/grading.functions";

export const Route = createFileRoute("/teacher/students")({
  component: () => <RoleGuard role="teacher"><Page /></RoleGuard>,
});

function Page() {
  const fn = useServerFn(teacherGetStudentMatrix);
  const q = useQuery({ queryKey: ["teacher-matrix"], queryFn: () => fn({}) });
  const data = q.data ?? { courses: [], students: [], cells: {} };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Students</h1>
        <p className="mt-1 text-muted-foreground">Progress per student per course.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              {data.courses.map((c: any) => <TableHead key={c.id} className="text-center">{c.title}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.map((s: any) => (
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
              </TableRow>
            ))}
            {data.students.length === 0 && (
              <TableRow><TableCell colSpan={data.courses.length + 1} className="text-center text-muted-foreground py-8">No enrolled students yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
