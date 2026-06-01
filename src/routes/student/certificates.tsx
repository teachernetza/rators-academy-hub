import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Loader2 } from "lucide-react";
import { listMyCertificates } from "@/lib/certificates.functions";

export const Route = createFileRoute("/student/certificates")({
  component: () => <RoleGuard role="student"><Page /></RoleGuard>,
});

function Page() {
  const fn = useServerFn(listMyCertificates);
  const q = useQuery({ queryKey: ["my-certificates"], queryFn: () => fn({}) });
  const items = q.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">My Certificates</h1>
        <p className="mt-1 text-muted-foreground">Earned by completing 100% of a course.</p>
      </div>
      {q.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Award className="h-8 w-8 text-primary/40" />
          Finish a course to earn your first certificate.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((c: any) => (
            <Card key={c.id} className="p-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Award className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold truncate">{c.courses?.title}</p>
                <p className="text-xs text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">{c.serial}</p>
              </div>
              <Link to="/student/certificates/$id" params={{ id: c.id }}>
                <Button size="sm" variant="outline">View</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
