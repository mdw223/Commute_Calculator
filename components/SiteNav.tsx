"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteNav() {
  const pathname = usePathname();
  const isSalaryPage = pathname === "/calculator";

  return (
    <nav className="border-b-3 border-ink bg-surface px-3 py-2">
      {isSalaryPage ? (
        <Link
          href="/"
          className="inline-block border-3 border-ink bg-surface px-4 py-2 font-mono text-xs uppercase hover:bg-cta/20 transition-colors shadow-brutal-sm"
        >
          ← Back to commute
        </Link>
      ) : (
        <Link
          href="/calculator"
          className="inline-block border-3 border-ink bg-cta text-ink px-4 py-2 font-mono text-xs uppercase hover:translate-x-0.5 hover:translate-y-0.5 transition-transform shadow-brutal-sm"
        >
          Salary Calculator →
        </Link>
      )}
    </nav>
  );
}
