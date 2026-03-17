import RegistrationTable from "@/components/admin/RegistrationTable";

export default function RegistrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Anmeldungen</h1>
        <p className="text-muted-foreground mt-1">Alle Anmeldungen über alle Events</p>
      </div>
      <RegistrationTable />
    </div>
  );
}
