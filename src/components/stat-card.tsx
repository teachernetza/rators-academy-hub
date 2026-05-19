import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "teal" | "violet" | "amber" | "rose" | "info" | "success";

const TONE: Record<Tone, { bg: string; fg: string; border: string }> = {
  primary: { bg: "bg-primary/10", fg: "text-primary", border: "border-primary/25" },
  teal: { bg: "bg-teal/10", fg: "text-teal", border: "border-teal/25" },
  violet: { bg: "bg-violet/10", fg: "text-violet", border: "border-violet/25" },
  amber: { bg: "bg-warning/15", fg: "text-warning", border: "border-warning/25" },
  rose: { bg: "bg-rose/10", fg: "text-rose", border: "border-rose/25" },
  info: { bg: "bg-info/10", fg: "text-info", border: "border-info/25" },
  success: { bg: "bg-success/10", fg: "text-success", border: "border-success/25" },
};

export function StatCard({
  label, value, icon: Icon, accent, tone = "primary",
}: { label: string; value: number | string; icon: LucideIcon; accent?: boolean; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <Card className={cn("p-5 transition-shadow hover:shadow-md", accent && t.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", t.bg, t.fg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
