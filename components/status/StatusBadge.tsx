import { Badge } from "@/components/ui/badge";
import type { RegistrationStatus } from "@/lib/types";

const statusConfig: Record<RegistrationStatus, { label: string; className: string }> = {
  pending: {
    label: "Ausstehend",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  approved: {
    label: "Bestätigt",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  rejected: {
    label: "Abgelehnt",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export default function StatusBadge({ status }: { status: RegistrationStatus }) {
  const config = statusConfig[status];
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
