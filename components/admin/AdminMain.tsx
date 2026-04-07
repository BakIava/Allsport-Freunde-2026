"use client";

import { useSession } from "next-auth/react";

export default function AdminMain({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <main className={authenticated ? "lg:ml-64 pt-14 lg:pt-0 min-h-screen" : "min-h-screen"}>
      <div className="p-4 md:p-8">{children}</div>
    </main>
  );
}
