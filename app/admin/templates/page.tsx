import Link from "next/link";
import { Button } from "@/components/ui/button";
import TemplateList from "@/components/admin/TemplateList";
import { Plus } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meine Vorlagen</h1>
          <p className="text-muted-foreground mt-1">
            Wiederverwendbare Vorlagen für neue Events
          </p>
        </div>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Neue Vorlage
          </Button>
        </Link>
      </div>
      <TemplateList />
    </div>
  );
}
