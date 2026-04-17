"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/admin/Sidebar";
import AdminMain from "@/components/admin/AdminMain";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SessionProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
          <AdminMain collapsed={sidebarCollapsed}>{children}</AdminMain>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
