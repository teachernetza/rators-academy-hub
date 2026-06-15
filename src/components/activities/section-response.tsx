import { useMemo, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

export type SectionLike = {
  id: string;
  title: string;
  instructions: string | null;
  section_type: "open_text" | "match_pairs" | "order_words";
  config: any;
};

export function SectionResponseInput({
  section, value, onChange, disabled,
}: {
  section: SectionLike;
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
}) {
  if (section.section_type === "open_text") {
    return (
      <div className="space-y-2">
        <Label>Tu respuesta</Label>
        <Textarea
          rows={6}
          value={value?.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          disabled={disabled}
          placeholder="Escribe aquí tu respuesta…"
        />
      </div>
    );
  }
  if (section.section_type === "match_pairs") {
    return <MatchPairsInput section={section} value={value} onChange={onChange} disabled={disabled} />;
  }
  if (section.section_type === "order_words") {
    return <OrderWordsInput section={section} value={value} onChange={onChange} disabled={disabled} />;
  }
  return null;
}

function MatchPairsInput({
  section, value, onChange, disabled,
}: { section: SectionLike; value: any; onChange: (v: any) => void; disabled?: boolean }) {
  const pairs: { left: string; right: string }[] = section.config?.pairs ?? [];
  const shuffledRights = useMemo(
    () => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section.id],
  );
  const answers: Record<string, string> = value?.answers ?? {};
  return (
    <div className="space-y-2">
      <Label>Une cada elemento de la columna A con su pareja</Label>
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border border-border p-2">
            <div className="text-sm font-medium">{p.left}</div>
            <span className="text-muted-foreground">→</span>
            <select
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={answers[p.left] ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ answers: { ...answers, [p.left]: e.target.value } })}
            >
              <option value="">Selecciona…</option>
              {shuffledRights.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderWordsInput({
  section, value, onChange, disabled,
}: { section: SectionLike; value: any; onChange: (v: any) => void; disabled?: boolean }) {
  const items: string[] = section.config?.items ?? [];
  const shuffled = useMemo(
    () => [...items].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section.id],
  );
  const [order, setOrder] = useState<string[]>(value?.order ?? shuffled);
  useEffect(() => {
    if (!value?.order) onChange({ order: shuffled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    onChange({ order: next });
  };

  return (
    <div className="space-y-2">
      <Label>Ordena las palabras</Label>
      <div className="space-y-1.5">
        {order.map((w, i) => (
          <Card key={`${w}-${i}`} className="flex items-center gap-2 p-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">{w}</span>
            <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={disabled}>↑</Button>
            <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={disabled}>↓</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SectionResponseView({ section, response }: { section: SectionLike; response: any }) {
  if (section.section_type === "open_text") {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
        {response?.text || <span className="text-muted-foreground italic">Sin respuesta</span>}
      </div>
    );
  }
  if (section.section_type === "match_pairs") {
    const pairs: { left: string; right: string }[] = section.config?.pairs ?? [];
    const answers: Record<string, string> = response?.answers ?? {};
    return (
      <div className="space-y-1.5 text-sm">
        {pairs.map((p, i) => {
          const ans = answers[p.left];
          const ok = ans === p.right;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="font-medium">{p.left}</span>
              <span className="text-muted-foreground">→</span>
              <span className={ok ? "text-success" : "text-foreground"}>{ans || "—"}</span>
              {!ok && <span className="text-xs text-muted-foreground">(esperado: {p.right})</span>}
            </div>
          );
        })}
      </div>
    );
  }
  if (section.section_type === "order_words") {
    const order: string[] = response?.order ?? [];
    const correct: string[] = section.config?.items ?? [];
    return (
      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground">Respuesta: </span>{order.join(" · ") || "—"}</div>
        <div><span className="text-muted-foreground">Correcto: </span>{correct.join(" · ")}</div>
      </div>
    );
  }
  return null;
}
