"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/sidebar";
import AdminMain from "@/components/admin/admin-main";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <AdminMain collapsed={sidebarCollapsed}>{children}</AdminMain>
      </div>
    </ToastProvider>
  );
}
