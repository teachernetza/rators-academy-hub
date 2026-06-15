import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, BookOpen } from "lucide-react";
import { listActivities, assignActivity } from "@/lib/activities.functions";
import { LEVEL_LABELS } from "./status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AssignActivityDialog({
  studentId,
  studentName,
  trigger,
}: {
  studentId: string;
  studentName?: string;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<string>("A1");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [due, setDue] = useState("");

  const fetchActs = useServerFn(listActivities);
  const assignFn = useServerFn(assignActivity);

  const actsQ = useQuery({
    queryKey: ["activities", "library", level],
    queryFn: () => fetchActs({ data: { level: level as any } }),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const list = actsQ.data ?? [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((a) => a.title.toLowerCase().includes(s));
  }, [actsQ.data, search]);

  const assignM = useMutation({
    mutationFn: () =>
      assignFn({
        data: {
          activity_id: picked!,
          student_id: studentId,
          due_date: due ? new Date(due).toISOString() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Actividad asignada");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setOpen(false);
      setPicked(null);
      setDue("");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo asignar"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Send className="mr-2 h-4 w-4" />Asignar actividad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Asignar actividad {studentName ? `a ${studentName}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Tabs value={level} onValueChange={(v) => { setLevel(v); setPicked(null); }}>
            <TabsList className="grid grid-cols-6">
              {LEVEL_LABELS.map((l) => (
                <TabsTrigger key={l} value={l}>{l}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="Buscar por título…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {actsQ.isLoading && (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!actsQ.isLoading && filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Sin actividades en este nivel.
              </div>
            )}
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setPicked(a.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors",
                  picked === a.id ? "bg-accent" : "hover:bg-muted/50",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.section_count} secciones · {a.author_name ?? "—"}
                  </p>
                </div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {a.cefr_level}
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Fecha límite (opcional)</Label>
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => assignM.mutate()}
            disabled={!picked || assignM.isPending}
          >
            {assignM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
