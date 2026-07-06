"use client";

import { useState } from "react";
import RegistrationTable from "@/components/admin/registration-table";
import { Button } from "@/components/ui/button";
import { History, CalendarClock } from "lucide-react";

export default function RegistrationsPage() {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anmeldungen</h1>
          <p className="text-muted-foreground mt-1">
            {showAll
              ? "Alle Anmeldungen über alle Events"
              : "Anmeldungen für kommende Events"}
          </p>
        </div>
        {showAll ? (
          <Button variant="outline" size="sm" onClick={() => setShowAll(false)}>
            <CalendarClock className="w-4 h-4 mr-2" />
            Nur kommende Events
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
            <History className="w-4 h-4 mr-2" />
            Alle Anmeldungen ansehen
          </Button>
        )}
      </div>
      <RegistrationTable upcomingOnly={!showAll} />
    </div>
  );
}
