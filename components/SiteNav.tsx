"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SweepsNavLocation from "@/components/sweeps/SweepsNavLocation";

export default function SiteNav() {
  const pathname = usePathname();
  const isSalaryPage = pathname === "/calculator";
  const isSweepsPage = pathname.startsWith("/sweeps");

  return (
    <nav className="border-b-3 border-ink bg-surface px-3 py-2 flex flex-wrap items-center gap-2">
      {isSalaryPage ? (
        <Link
          href="/"
          className="inline-block border-3 border-ink bg-surface px-4 py-2 font-mono text-xs uppercase hover:bg-cta/20 transition-colors shadow-brutal-sm"
        >
          ← Back to commute
        </Link>
      ) : isSweepsPage ? (
        <div className="flex flex-wrap items-center gap-50 flex-1 min-w-0">
          <Link
            href="/"
            className="inline-block border-3 border-ink bg-surface px-4 py-2 font-mono text-xs uppercase hover:bg-cta/20 transition-colors shadow-brutal-sm shrink-0"
          >
            ← Commute calculator
          </Link>
          <SweepsNavLocation />
        </div>
      ) : (
        <>
          <Link
            href="/calculator"
            className="inline-block border-3 border-ink bg-cta text-ink px-4 py-2 font-mono text-xs uppercase hover:translate-x-0.5 hover:translate-y-0.5 transition-transform shadow-brutal-sm"
          >
            Salary Calculator →
          </Link>
          <Link
            href="/sweeps"
            className="inline-block border-3 border-ink bg-surface px-4 py-2 font-mono text-xs uppercase hover:bg-cta/20 transition-colors shadow-brutal-sm"
          >
            Sweeps Jobs →
          </Link>
        </>
      )}
    </nav>
  );
}
