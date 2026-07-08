import { useMemo, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GripVertical, CheckCircle2, XCircle } from "lucide-react";

export type SectionLike = {
  id: string;
  title: string;
  instructions: string | null;
  section_type:
    | "open_text"
    | "match_pairs"
    | "order_words"
    | "multiple_choice"
    | "multi_select"
    | "video_questions"
    | "audio_questions";
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
  if (section.section_type === "multiple_choice") {
    return <ChoiceQuestionsInput section={section} value={value} onChange={onChange} disabled={disabled} multiple={false} />;
  }
  if (section.section_type === "multi_select") {
    return <ChoiceQuestionsInput section={section} value={value} onChange={onChange} disabled={disabled} multiple />;
  }
  if (section.section_type === "video_questions") {
    return <MediaQuestionsInput section={section} value={value} onChange={onChange} disabled={disabled} type="video" />;
  }
  if (section.section_type === "audio_questions") {
    return <MediaQuestionsInput section={section} value={value} onChange={onChange} disabled={disabled} type="audio" />;
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

function ChoiceQuestionsInput({
  section, value, onChange, disabled, multiple,
}: { section: SectionLike; value: any; onChange: (v: any) => void; disabled?: boolean; multiple: boolean }) {
  const questions: Array<{ text: string; options: string[] }> = section.config?.questions ?? [];
  const answers: Record<string, number[]> = value?.answers ?? {};
  const setAnswer = (qi: number, option: number) => {
    const key = String(qi);
    const current = answers[key] ?? [];
    const next = multiple
      ? current.includes(option)
        ? current.filter((x) => x !== option)
        : [...current, option]
      : [option];
    onChange({ answers: { ...answers, [key]: next } });
  };
  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <Card key={qi} className="space-y-3 p-3">
          <Label className="font-semibold">{q.text || `Pregunta ${qi + 1}`}</Label>
          <div className="space-y-2">
            {(q.options ?? []).map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`answer-${section.id}-${qi}`}
                  checked={(answers[String(qi)] ?? []).includes(oi)}
                  onChange={() => setAnswer(qi, oi)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MediaQuestionsInput({
  section, value, onChange, disabled, type,
}: { section: SectionLike; value: any; onChange: (v: any) => void; disabled?: boolean; type: "video" | "audio" }) {
  const mediaUrl = section.config?.media_url;
  return (
    <div className="space-y-4">
      {mediaUrl && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          {type === "video" ? (
            <div className="aspect-video overflow-hidden rounded-md bg-foreground/10">
              <iframe src={mediaUrl} title="Actividad de video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <audio src={mediaUrl} controls className="w-full" />
          )}
        </div>
      )}
      <ChoiceQuestionsInput section={section} value={value} onChange={onChange} disabled={disabled} multiple={false} />
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
  if (["multiple_choice", "multi_select", "video_questions", "audio_questions"].includes(section.section_type)) {
    const questions: Array<{ text: string; options: string[]; correct?: number[] }> = section.config?.questions ?? [];
    const answers: Record<string, number[]> = response?.answers ?? {};
    return (
      <div className="space-y-3 text-sm">
        {(section.section_type === "video_questions" || section.section_type === "audio_questions") && section.config?.media_url && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            {section.section_type === "video_questions" ? (
              <div className="aspect-video overflow-hidden rounded-md bg-foreground/10">
                <iframe src={section.config.media_url} title="Material respondido" className="h-full w-full" allowFullScreen />
              </div>
            ) : (
              <audio src={section.config.media_url} controls className="w-full" />
            )}
          </div>
        )}
        {questions.map((q, qi) => {
          const picked = answers[String(qi)] ?? [];
          const correct = q.correct ?? [];
          const ok = picked.length === correct.length && picked.every((x) => correct.includes(x));
          return (
            <div key={qi} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-start gap-2 font-medium">
                {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span>{q.text}</span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div>Respuesta: {picked.map((i) => q.options?.[i]).filter(Boolean).join(", ") || "—"}</div>
                <div>Correcta: {correct.map((i) => q.options?.[i]).filter(Boolean).join(", ") || "—"}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}
