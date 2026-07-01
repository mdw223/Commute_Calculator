"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/sweeps", label: "Jobs" },
  { href: "/sweeps/planner", label: "Day Planner" },
  { href: "/sweeps/route", label: "Plan Route" },
  { href: "/sweeps/settings", label: "Settings" },
] as const;

export default function SweepsSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 flex-wrap">
      {LINKS.map(({ href, label }) => {
        const active = href === "/sweeps" ? pathname === "/sweeps" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`border-2 border-ink px-3 py-1 font-mono text-xs uppercase transition-colors ${
              active ? "bg-cta" : "bg-surface hover:bg-cta/20"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
