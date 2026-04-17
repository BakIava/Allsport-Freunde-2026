"use client";

import { useSession } from "next-auth/react";

export default function AdminMain({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <main className={authenticated ? "flex-1 pt-14 lg:pt-0 min-h-screen overflow-x-auto" : "flex-1 min-h-screen overflow-x-auto"}>
      <div className="p-4 md:p-8 min-w-min">{children}</div>
    </main>
  );
}
