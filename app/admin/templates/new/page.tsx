import TemplateForm from "@/components/admin/TemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Neue Vorlage</h1>
        <p className="text-muted-foreground mt-1">
          Erstelle eine Vorlage für wiederkehrende Veranstaltungen
        </p>
      </div>
      <TemplateForm />
    </div>
  );
}
