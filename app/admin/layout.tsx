import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/admin/Sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
            <div className="p-4 md:p-8">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
