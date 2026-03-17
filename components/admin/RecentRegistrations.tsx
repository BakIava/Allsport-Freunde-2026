"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { RegistrationWithEvent } from "@/lib/types";

export default function RecentRegistrations() {
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/registrations")
      .then((r) => r.json())
      .then((data: RegistrationWithEvent[]) => setRegistrations(data.slice(0, 10)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Letzte Anmeldungen</CardTitle>
        <Link href="/admin/registrations">
          <Button variant="outline" size="sm">
            Alle anzeigen
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
          </div>
        ) : registrations.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Noch keine Anmeldungen.</p>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vorname</TableHead>
                  <TableHead>Nachname</TableHead>
                  <TableHead className="hidden sm:table-cell">E-Mail</TableHead>
                  <TableHead className="hidden md:table-cell">Event</TableHead>
                  <TableHead className="hidden sm:table-cell">Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.first_name}</TableCell>
                    <TableCell>{r.last_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.email}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">{r.event_title}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDateTime(r.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
