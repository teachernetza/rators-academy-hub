import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { LEVEL_LABELS } from "@/components/activities/status-badge";
import {
  listActivities, createActivity, CEFR_LEVELS,
} from "@/lib/activities.functions";
import { toast } from "sonner";

export function ActivitiesLibrary({ basePath }: { basePath: "/admin/activities" | "/teacher/activities" }) {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listActivities);
  const createFn = useServerFn(createActivity);

  const [level, setLevel] = useState<string>("A1");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", cefr_level: "A1" as typeof CEFR_LEVELS[number] });

  const actsQ = useQuery({
    queryKey: ["activities", "library", level],
    queryFn: () => fetchAll({ data: { level: level as any } }),
  });

  const createM = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: form.title,
          description: form.description || null,
          cefr_level: form.cefr_level,
          is_published: true,
        },
      }),
    onSuccess: (a) => {
      toast.success("Actividad creada");
      qc.invalidateQueries({ queryKey: ["activities"] });
      setOpen(false);
      setForm({ title: "", description: "", cefr_level: form.cefr_level });
      // navigate to editor handled by user via the card link
      window.location.href = `${basePath}/${a.id}`;
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  const filtered = useMemo(() => {
    const list = actsQ.data ?? [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((a) => a.title.toLowerCase().includes(s));
  }, [actsQ.data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Biblioteca de actividades</h1>
          <p className="mt-1 text-muted-foreground">Plantillas reutilizables organizadas por nivel CEFR.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />Nueva actividad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva actividad</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createM.mutate(); }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nivel</Label>
                <Select
                  value={form.cefr_level}
                  onValueChange={(v) => setForm({ ...form, cefr_level: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createM.isPending}>
                  {createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear y editar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={level} onValueChange={setLevel}>
            <TabsList className="grid w-full grid-cols-6 sm:w-auto">
              {LEVEL_LABELS.map((l) => (
                <TabsTrigger key={l} value={l}>{l}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>

        {actsQ.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Aún no hay actividades en este nivel.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <Link
                key={a.id}
                to={`${basePath}/$id` as any}
                params={{ id: a.id } as any}
                className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-semibold leading-tight">{a.title}</h3>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{a.cefr_level}</span>
                </div>
                {a.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{a.section_count} secciones</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
