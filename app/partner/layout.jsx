"use client";

import { HospitalGateClient } from "./_components/HospitalGateClient";
import { HospitalNav } from "./_components/HospitalNav";

export default function HospitalLayout({ children }) {
  return (
    <HospitalGateClient>
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 pt-12">
        <HospitalNav />
        <main className="flex-1 pt-14 lg:pt-0 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </HospitalGateClient>
  );
}
