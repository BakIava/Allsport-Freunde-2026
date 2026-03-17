import Link from "next/link";
import { Button } from "@/components/ui/button";
import EventTable from "@/components/admin/EventTable";
import { Plus } from "lucide-react";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-muted-foreground mt-1">Alle Events verwalten</p>
        </div>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Neues Event
          </Button>
        </Link>
      </div>
      <EventTable />
    </div>
  );
}
