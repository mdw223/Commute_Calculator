import { Suspense } from "react";
import SweepsDashboard from "@/components/sweeps/SweepsDashboard";

export const metadata = {
  title: "Sweeps Jobs — Gas In This Economy",
  description: "Dashboard for Sweeps job notifications with drive-time and cost analysis.",
};

export default function SweepsPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
      <SweepsDashboard />
    </Suspense>
  );
}
