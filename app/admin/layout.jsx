"use client";

import { AdminGateClient } from "./_components/AdminGateClient";
import { AdminNav } from "./_components/AdminNav";

export default function AdminLayout({ children }) {
  return (
    <AdminGateClient>
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 pt-12">
        <AdminNav />
        {/* Content: pt-14 on mobile for the nav bar, lg:pt-0 on desktop */}
        <main className="flex-1 overflow-auto pt-14 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </AdminGateClient>
  );
}
