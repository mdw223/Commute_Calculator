"use client";

import { CoverLettersProvider } from "@/components/coverletters/CoverLettersProvider";

export default function CoverLettersLayout({ children }: { children: React.ReactNode }) {
  return <CoverLettersProvider>{children}</CoverLettersProvider>;
}
