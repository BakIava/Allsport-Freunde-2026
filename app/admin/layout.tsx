import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/admin/Sidebar";
import AdminMain from "@/components/admin/AdminMain";
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
          <AdminMain>{children}</AdminMain>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
