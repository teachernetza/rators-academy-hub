import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AssignmentStatus = "pending" | "in_review" | "changes_requested" | "approved";
export type SectionStatus = "pending_review" | "approved" | "changes_requested";

const LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  changes_requested: "Requiere cambios",
  approved: "Aprobada",
  pending_review: "Sin revisar",
};

const STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  in_review: "bg-accent text-accent-foreground border-transparent",
  changes_requested: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  pending_review: "bg-muted text-muted-foreground border-transparent",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status] ?? "", className)}>
      {LABELS[status] ?? status}
    </Badge>
  );
}

export const LEVEL_LABELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
