import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { getCertificate } from "@/lib/certificates.functions";
import { Award, ChevronLeft, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/student/certificates/$id")({
  component: () => <RoleGuard role="student"><Page /></RoleGuard>,
});

function Page() {
  const { id } = Route.useParams();
  const fn = useServerFn(getCertificate);
  const q = useQuery({ queryKey: ["certificate", id], queryFn: () => fn({ data: { id } }) });

  if (q.isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const c: any = q.data;
  if (!c) return <p>Not found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/student/certificates"><Button variant="ghost" size="sm"><ChevronLeft className="mr-1 h-4 w-4" />Back</Button></Link>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-3xl border-8 border-double border-primary/30 bg-card p-12 text-center shadow-[var(--shadow-elegant)] print:border-primary print:shadow-none">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Award className="h-8 w-8" />
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Certificate of Completion</p>
        <h1 className="font-heading mt-6 text-4xl font-bold">{c.student_name}</h1>
        <p className="mt-6 text-muted-foreground">has successfully completed the course</p>
        <h2 className="font-heading mt-4 text-2xl font-semibold text-primary">{c.courses?.title}</h2>
        {c.courses?.description && (
          <p className="mt-4 max-w-xl mx-auto text-sm text-muted-foreground">{c.courses.description}</p>
        )}
        <div className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
          <div className="text-left">
            <p className="font-semibold text-foreground">Rators Academy</p>
            <p>Issued {new Date(c.issued_at).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="font-mono">{c.serial}</p>
            <p>Verification serial</p>
          </div>
        </div>
      </div>
    </div>
  );
}
