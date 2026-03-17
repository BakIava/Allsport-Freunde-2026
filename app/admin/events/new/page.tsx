import EventForm from "@/components/admin/EventForm";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Neues Event</h1>
        <p className="text-muted-foreground mt-1">Erstelle ein neues Event für den Verein</p>
      </div>
      <EventForm />
    </div>
  );
}
