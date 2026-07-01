"use client";

import { SweepsProvider } from "@/components/sweeps/SweepsProvider";

export default function SweepsLayout({ children }: { children: React.ReactNode }) {
  return <SweepsProvider>{children}</SweepsProvider>;
}
