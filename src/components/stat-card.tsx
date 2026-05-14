import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, accent,
}: { label: string; value: number | string; icon: LucideIcon; accent?: boolean }) {
  return (
    <Card className={cn("p-5", accent && "border-primary/30")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
