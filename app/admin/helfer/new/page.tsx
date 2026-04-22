import HelferForm from "@/components/admin/HelferForm";

export default function NewHelferPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Neuer Helfer</h1>
        <p className="text-muted-foreground mt-1">
          Helfer können Vereinsmitglieder oder externe Personen sein.
        </p>
      </div>
      <HelferForm />
    </div>
  );
}
